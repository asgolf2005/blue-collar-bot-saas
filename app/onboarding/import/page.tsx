'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ValidationIssue = {
  row: number
  message: string
}

type ImportSummary = {
  customersImported: number
  customersSkipped: number
  techniciansImported: number
  techniciansSkipped: number
  jobsImported: number
  jobsSkipped: number
  errors: string[]
}

type AccessState = 'checking' | 'allowed' | 'blocked'

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }

  out.push(current.trim())
  return out
}

function parseCsvPreview(text: string) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [] as string[], rows: [] as string[][] }
  }

  const headers = parseCsvLine(lines[0]).map((cell) => cell.replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map((line) => parseCsvLine(line))
  return { headers, rows }
}

export default function ImportOnboardingPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [accessMessage, setAccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const verifyAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      if (!user) {
        setAccessState('blocked')
        setAccessMessage('Sign in as an admin account before importing customers, technicians, and jobs.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!mounted) return

      if (profileError) {
        setAccessState('blocked')
        setAccessMessage('Could not verify your account permissions. Please sign out and sign in again.')
        return
      }

      if (!profile) {
        setAccessState('blocked')
        setAccessMessage('Complete onboarding step 1 first to create your admin profile.')
        return
      }

      if (profile.role !== 'admin') {
        setAccessState('blocked')
        setAccessMessage('Only admin accounts can run onboarding imports.')
        return
      }

      setAccessState('allowed')
      setAccessMessage(null)
    }

    void verifyAccess()

    return () => {
      mounted = false
    }
  }, [supabase])

  const mappedColumns = useMemo(() => {
      const map: Record<string, string> = {
        name: 'Customer Name',
        customer_name: 'Customer Name',
      phone: 'Phone',
      customer_phone: 'Phone',
      email: 'Email',
      customer_email: 'Email',
      address: 'Address',
      customer_address: 'Address',
      scheduled_start: 'Job Start',
        scheduled_end: 'Job End',
        status: 'Job Status',
        description: 'Description',
        technician_name: 'Technician Name',
        technician_email: 'Technician Email',
        technician_phone: 'Technician Phone',
        tech_name: 'Technician Name',
        tech_email: 'Technician Email',
        tech_phone: 'Technician Phone',
        hourly_rate: 'Technician Hourly Rate',
      }

    return headers.map((header) => {
      const normalized = normalizeHeader(header)
      return {
        source: header,
        target: map[normalized] || 'Unmapped',
        mapped: Boolean(map[normalized]),
      }
    })
  }, [headers])

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }

  const validateRows = (headerValues: string[], rows: string[][]): ValidationIssue[] => {
    const normalizedHeaders = headerValues.map(normalizeHeader)
    const phoneIndex = normalizedHeaders.findIndex((header) =>
      ['phone', 'customer_phone', 'phone_number', 'mobile'].includes(header)
    )

    const findings: ValidationIssue[] = []
    if (phoneIndex === -1) {
      findings.push({
        row: 1,
        message: 'No phone column detected. Add "phone", "customer_phone", or "technician_phone".',
      })
      return findings
    }

    rows.forEach((row, index) => {
      const displayRow = index + 2
      const phone = row[phoneIndex]?.trim()
      if (!phone) {
        findings.push({ row: displayRow, message: 'Missing phone' })
      }
    })
    return findings
  }

  const readFilePreview = async (nextFile: File) => {
    setError(null)
    setSummary(null)

    const name = nextFile.name.toLowerCase()
    if (!name.endsWith('.csv')) {
      setHeaders([])
      setPreviewRows([])
      setIssues([{ row: 1, message: 'Preview supports CSV files. You can still import XLSX/JSON directly.' }])
      return
    }

    const text = await nextFile.text()
    const parsed = parseCsvPreview(text)
    setHeaders(parsed.headers)
    setPreviewRows(parsed.rows.slice(0, 3))
    setIssues(validateRows(parsed.headers, parsed.rows))
  }

  const handleFileSelect = async (nextFile: File) => {
    setFile(nextFile)
    await readFilePreview(nextFile)
  }

  const handleImport = async () => {
    if (accessState !== 'allowed') {
      setError(accessMessage || 'Sign in as an admin account before importing.')
      return
    }

    if (!file) return

    setUploading(true)
    setProgress(4)
    setError(null)
    setSummary(null)
    clearProgressTimer()
    progressTimerRef.current = setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 6))
    }, 160)

    try {
      const formData = new FormData()
      formData.set('file', file)
      const response = await fetch('/api/onboarding/import', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Import failed')
      }

      setProgress(100)
      setSummary(payload.summary as ImportSummary)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to import file')
    } finally {
      clearProgressTimer()
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 450)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-[-120px] bottom-[-180px] h-[460px] w-[460px] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_45%)]" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:py-10">
        <header className="rounded-lg border border-slate-700 bg-slate-900/80 p-5 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">Onboarding Import</p>
              <h1 className="font-display text-5xl uppercase tracking-[0.08em] text-white">
                Import Customers, Technicians & Jobs
              </h1>
              <p className="text-sm text-slate-300">Upload CSV, map fields, validate rows, and import in one flow.</p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              Back to Onboarding
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/samples/customers-import-valid.csv"
              className="rounded-[2px] border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
            >
              Download valid sample CSV
            </a>
            <a
              href="/samples/customers-import-validation-demo.csv"
              className="rounded-[2px] border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
            >
              Download validation demo CSV
            </a>
          </div>
        </header>

        {accessState === 'checking' && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
            Checking account permissions...
          </div>
        )}

        {accessState === 'blocked' && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">{accessMessage}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/login"
                className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Go to Login
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Create Business Account
              </Link>
            </div>
          </div>
        )}

        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 bg-slate-900'
          } ${accessState !== 'allowed' ? 'pointer-events-none opacity-60' : ''}`}
          onDragEnter={(event) => {
            if (accessState !== 'allowed') return
            event.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(event) => {
            if (accessState !== 'allowed') return
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(event) => {
            if (accessState !== 'allowed') return
            event.preventDefault()
            setDragActive(false)
          }}
          onDrop={(event) => {
            if (accessState !== 'allowed') return
            event.preventDefault()
            setDragActive(false)
            const dropped = event.dataTransfer.files?.[0]
            if (dropped) {
              void handleFileSelect(dropped)
            }
          }}
        >
          <p className="text-lg font-semibold text-slate-100">Drag and drop your import file</p>
          <p className="mt-1 text-sm text-slate-400">CSV preview supported. XLSX/JSON can be imported directly.</p>
          <button
            type="button"
            disabled={accessState !== 'allowed'}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            disabled={accessState !== 'allowed'}
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0]
              if (selected) {
                void handleFileSelect(selected)
              }
            }}
          />
          {file && <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-cyan-400">{file.name}</p>}
        </div>

        {headers.length > 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold text-slate-200">Field Mapping Preview</h2>
            <p className="mb-3 text-sm text-slate-400">Showing first 3 rows</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {mappedColumns.map((column) => (
                <span
                  key={column.source}
                  className={`rounded-[2px] border px-2 py-1 text-xs ${
                    column.mapped
                      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-400'
                      : 'border-slate-600 bg-slate-800 text-slate-300'
                  }`}
                >
                  {column.source} {'->'} {column.target}
                </span>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-700">
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="px-2 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={`row-${index}`} className="border-b border-slate-800">
                      {headers.map((_, cellIndex) => (
                        <td key={`cell-${index}-${cellIndex}`} className="px-2 py-2 text-sm text-slate-200">
                          {row[cellIndex] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {issues.length > 0 && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
            <h2 className="text-lg font-semibold text-rose-300">Validation Errors</h2>
            <div className="mt-2 space-y-1">
              {issues.slice(0, 8).map((issue, index) => (
                <p key={`${issue.row}-${index}`} className="font-mono text-xs text-rose-200">
                  row {issue.row}: {issue.message}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">Import</h2>
              <p className="text-sm text-slate-400">Run full import to create customers, technicians, and jobs.</p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={accessState !== 'allowed' || !file || uploading}
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Importing...' : 'Start Import'}
            </button>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-md bg-slate-800">
                <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-400">Progress: {progress}%</p>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

          {summary && (
            <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-sm font-semibold text-emerald-300">
                Imported {summary.customersImported} customers, {summary.customersSkipped} skipped
              </p>
              <p className="text-sm font-semibold text-emerald-300">
                Imported {summary.techniciansImported} technicians, {summary.techniciansSkipped} skipped
              </p>
              <p className="text-sm font-semibold text-emerald-300">
                Imported {summary.jobsImported} jobs, {summary.jobsSkipped} skipped
              </p>
              {summary.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {summary.errors.slice(0, 5).map((item, index) => (
                    <p key={`summary-error-${index}`} className="font-mono text-xs text-amber-300">
                      {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
