'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddressAutocomplete from '@/components/common/AddressAutocomplete'
import { Briefcase, Building, Check, Database, Download, Upload, Workflow } from '@/components/ui/icons'

type ImportSummary = {
  customersImported: number
  customersSkipped: number
  techniciansImported: number
  techniciansSkipped: number
  jobsImported: number
  jobsSkipped: number
  errors: string[]
}

type SignupData = {
  user_id: string
  business_name: string
  owner_name: string
  email: string
  phone: string
}

type ServiceDraft = {
  name: string
}

type TradeKey =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'landscaping'
  | 'carpentry'
  | 'roofing'
  | 'painting'
  | 'cleaning'
  | 'appliance_repair'
  | 'pest_control'
  | 'locksmith'
  | 'handyman'

type TradePreset = {
  label: string
  keywords: string[]
  services: ServiceDraft[]
}

const TRADE_PRESETS: Record<TradeKey, TradePreset> = {
  plumbing: {
    label: 'Plumbing',
    keywords: ['plumb', 'drain', 'leak', 'water heater', 'sewer', 'pipe', 'faucet'],
    services: [
      { name: 'Drain Cleaning' },
      { name: 'Leak Repair' },
      { name: 'Water Heater Service' },
      { name: 'Toilet Repair' },
      { name: 'Faucet Installation' },
      { name: 'Sewer Line Inspection' },
    ],
  },
  electrical: {
    label: 'Electrical',
    keywords: ['electrical', 'panel', 'breaker', 'wiring', 'outlet', 'switch', 'voltage'],
    services: [
      { name: 'Panel Upgrade' },
      { name: 'Outlet Installation' },
      { name: 'Lighting Installation' },
      { name: 'Electrical Troubleshooting' },
      { name: 'Circuit Breaker Repair' },
      { name: 'EV Charger Installation' },
    ],
  },
  hvac: {
    label: 'HVAC',
    keywords: ['hvac', 'ac', 'furnace', 'heat pump', 'thermostat', 'cooling', 'heating'],
    services: [
      { name: 'AC Tune-Up' },
      { name: 'Furnace Maintenance' },
      { name: 'Thermostat Install' },
      { name: 'HVAC Diagnostic' },
      { name: 'Heat Pump Service' },
      { name: 'Ductwork Inspection' },
    ],
  },
  landscaping: {
    label: 'Landscaping',
    keywords: ['landscape', 'lawn', 'mowing', 'irrigation', 'sprinkler', 'yard', 'garden'],
    services: [
      { name: 'Lawn Mowing' },
      { name: 'Yard Cleanup' },
      { name: 'Sprinkler Repair' },
      { name: 'Mulch Installation' },
      { name: 'Seasonal Pruning' },
      { name: 'Sod Installation' },
    ],
  },
  carpentry: {
    label: 'Carpentry',
    keywords: ['carpentry', 'cabinet', 'trim', 'door', 'frame', 'wood', 'deck'],
    services: [
      { name: 'Door Installation' },
      { name: 'Trim Repair' },
      { name: 'Cabinet Adjustment' },
      { name: 'Deck Repair' },
      { name: 'Custom Shelving' },
      { name: 'Framing Repair' },
    ],
  },
  roofing: {
    label: 'Roofing',
    keywords: ['roof', 'shingle', 'gutter', 'flashing', 'leak'],
    services: [
      { name: 'Roof Leak Repair' },
      { name: 'Shingle Replacement' },
      { name: 'Gutter Cleaning' },
      { name: 'Roof Inspection' },
      { name: 'Flashing Repair' },
      { name: 'Storm Damage Assessment' },
    ],
  },
  painting: {
    label: 'Painting',
    keywords: ['paint', 'primer', 'stain', 'drywall', 'interior', 'exterior'],
    services: [
      { name: 'Interior Room Paint' },
      { name: 'Exterior Touch-Up' },
      { name: 'Drywall Patch + Paint' },
      { name: 'Fence Staining' },
      { name: 'Cabinet Painting' },
      { name: 'Commercial Repaint' },
    ],
  },
  cleaning: {
    label: 'Cleaning',
    keywords: ['clean', 'janitorial', 'deep clean', 'sanit', 'maid'],
    services: [
      { name: 'Standard Cleaning' },
      { name: 'Deep Cleaning' },
      { name: 'Move-Out Cleaning' },
      { name: 'Post-Construction Cleaning' },
      { name: 'Office Cleaning' },
      { name: 'Sanitization Service' },
    ],
  },
  appliance_repair: {
    label: 'Appliance Repair',
    keywords: ['appliance', 'refrigerator', 'washer', 'dryer', 'dishwasher', 'oven'],
    services: [
      { name: 'Refrigerator Repair' },
      { name: 'Washer/Dryer Repair' },
      { name: 'Dishwasher Repair' },
      { name: 'Oven Repair' },
      { name: 'Microwave Repair' },
      { name: 'Appliance Maintenance Visit' },
    ],
  },
  pest_control: {
    label: 'Pest Control',
    keywords: ['pest', 'termite', 'rodent', 'roach', 'inspection', 'extermination'],
    services: [
      { name: 'General Pest Treatment' },
      { name: 'Termite Inspection' },
      { name: 'Rodent Control' },
      { name: 'Follow-Up Treatment' },
      { name: 'Mosquito Treatment' },
      { name: 'Commercial Pest Plan' },
    ],
  },
  locksmith: {
    label: 'Locksmith',
    keywords: ['locksmith', 'lockout', 'rekey', 'deadbolt', 'key'],
    services: [
      { name: 'House Lockout Service' },
      { name: 'Rekey Service' },
      { name: 'Deadbolt Installation' },
      { name: 'Key Duplication Service' },
      { name: 'Smart Lock Installation' },
      { name: 'Commercial Lock Repair' },
    ],
  },
  handyman: {
    label: 'Handyman / General Trades',
    keywords: ['handyman', 'general repair', 'maintenance', 'fix', 'install'],
    services: [
      { name: 'General Home Repair' },
      { name: 'Fixture Installation' },
      { name: 'Drywall Repair' },
      { name: 'Preventive Maintenance Visit' },
      { name: 'Furniture Assembly' },
      { name: 'Property Punch List Service' },
    ],
  },
}

const TRADE_OPTIONS = Object.entries(TRADE_PRESETS).map(([key, value]) => ({
  key: key as TradeKey,
  label: value.label,
}))

const inputClass =
  'h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30'
const primaryBtnClass =
  'inline-flex h-11 w-full items-center justify-center rounded-full bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60'

function clonePresetServices(trade: TradeKey): ServiceDraft[] {
  return TRADE_PRESETS[trade].services.map((service) => ({ ...service }))
}

function detectTradeFromText(text: string): TradeKey | null {
  const source = text.toLowerCase()
  let bestTrade: TradeKey | null = null
  let bestScore = 0

  for (const option of TRADE_OPTIONS) {
    let score = 0
    for (const keyword of TRADE_PRESETS[option.key].keywords) {
      if (source.includes(keyword)) {
        score += 1
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestTrade = option.key
    }
  }

  return bestScore > 0 ? bestTrade : null
}

async function detectTradeFromFile(file: File): Promise<TradeKey | null> {
  const lowerName = file.name.toLowerCase()

  if (lowerName.endsWith('.csv') || lowerName.endsWith('.json') || lowerName.endsWith('.txt')) {
    const text = await file.text()
    return detectTradeFromText(`${file.name}\n${text.slice(0, 8000)}`)
  }

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    try {
      const xlsx = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = xlsx.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) return null
      const firstSheet = workbook.Sheets[firstSheetName]
      const csvLike = xlsx.utils.sheet_to_csv(firstSheet)
      return detectTradeFromText(`${file.name}\n${csvLike.slice(0, 8000)}`)
    } catch {
      return null
    }
  }

  return detectTradeFromText(file.name)
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [detectingTrade, setDetectingTrade] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importHint, setImportHint] = useState<string | null>(null)
  const [signupData, setSignupData] = useState<SignupData | null>(null)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importSkipped, setImportSkipped] = useState(false)
  const [importCollapsed, setImportCollapsed] = useState(false)

  const [address, setAddress] = useState('')
  const [calendarId, setCalendarId] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [selectedTrade, setSelectedTrade] = useState<TradeKey | ''>('')
  const [services, setServices] = useState<ServiceDraft[]>([])

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkOnboardingData = async () => {
      const raw = localStorage.getItem('onboarding_data')

      if (!raw) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      try {
        const parsed = JSON.parse(raw) as SignupData
        if (!parsed.user_id || !parsed.business_name || !parsed.email) {
          throw new Error('Invalid onboarding state')
        }
        setSignupData(parsed)
      } catch {
        localStorage.removeItem('onboarding_data')
        await supabase.auth.signOut()
        router.push('/login')
      }
    }

    void checkOnboardingData()
  }, [router, supabase])

  const addService = () => {
    setServices((current) => [...current, { name: '' }])
  }

  const removeService = (index: number) => {
    setServices((current) => current.filter((_, idx) => idx !== index))
  }

  const updateService = (index: number, value: string) => {
    setServices((current) => {
      const next = [...current]
      next[index] = { ...next[index], name: value }
      return next
    })
  }

  const handleTradeChange = (value: string) => {
    const trade = value as TradeKey
    setSelectedTrade(trade)
    setServices(clonePresetServices(trade))
    setError(null)
  }

  const handleImportFileSelect = async (file: File | null) => {
    setImportFile(file)
    setImportSummary(null)
    setImportSkipped(false)
    setImportCollapsed(false)
    setImportHint(null)

    if (!file) return

    setDetectingTrade(true)
    const detected = await detectTradeFromFile(file)
    setDetectingTrade(false)

    if (!detected) {
      setImportHint('Could not auto-detect trade from this file. Select trade manually.')
      return
    }

    if (!selectedTrade) {
      setSelectedTrade(detected)
      setServices(clonePresetServices(detected))
      setImportHint(`Detected ${TRADE_PRESETS[detected].label}. Default services loaded.`)
      return
    }

    if (selectedTrade !== detected) {
      setImportHint(`File looks like ${TRADE_PRESETS[detected].label}, but current selection is ${TRADE_PRESETS[selectedTrade].label}.`)
      return
    }

    setImportHint(`Detected ${TRADE_PRESETS[detected].label}.`)
  }

  const handleStep1 = async () => {
    if (!signupData) {
      setError('Missing signup data. Please create your account again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/complete-step-1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: signupData.user_id,
          business_name: signupData.business_name,
          owner_name: signupData.owner_name,
          email: signupData.email,
          phone: signupData.phone,
          address,
          calendar_id: calendarId || null,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding.')
      }

      setBusinessId(result.business_id)
      setStep(2)
    } catch (stepError: unknown) {
      setError(stepError instanceof Error ? stepError.message : 'Failed to complete onboarding.')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async () => {
    setLoading(true)
    setError(null)

    try {
      const validServices = services.filter((service) => service.name.trim())

      if (!selectedTrade) {
        throw new Error('Select a trade type before continuing.')
      }

      if (validServices.length === 0) {
        throw new Error('Add at least one service before continuing.')
      }

      const { error: servicesError } = await supabase.from('services').insert(
        validServices.map((service) => ({
          business_id: businessId,
          name: service.name.trim(),
          is_active: true,
        }))
      )

      if (servicesError) {
        throw servicesError
      }

      setStep(3)
    } catch (stepError: unknown) {
      setError(stepError instanceof Error ? stepError.message : 'Failed to save services.')
    } finally {
      setLoading(false)
    }
  }

  const handleImportData = async () => {
    if (!importFile) {
      setError('Please choose a JSON, CSV, or Excel file to import customers, technicians, and jobs.')
      return
    }

    setImportLoading(true)
    setError(null)
    setImportSummary(null)
    setImportSkipped(false)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/onboarding/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import data.')
      }

      setImportSummary(result.summary as ImportSummary)
      setImportHint('Import complete.')
    } catch (importError: unknown) {
      setError(importError instanceof Error ? importError.message : 'Failed to import data.')
    } finally {
      setImportLoading(false)
    }
  }

  const handleSkipImport = () => {
    setImportFile(null)
    setImportSummary(null)
    setImportSkipped(true)
    setImportCollapsed(true)
    setImportHint('Import skipped. You can import data later from the admin dashboard.')
  }

  const downloadImportTemplate = () => {
    const template = {
      customers: [
        {
          name: 'Acme Property Group',
          phone: '+1 555 0101',
          email: 'accounts@acme.example',
          address: '123 Main Street, Springfield',
        },
      ],
      technicians: [
        {
          name: 'Alex Rivera',
          email: 'alex.tech@acme.example',
          phone: '+1 555 0202',
          hourly_rate: 85,
        },
      ],
      jobs: [
        {
          customer_email: 'accounts@acme.example',
          technician_email: 'alex.tech@acme.example',
          scheduled_start: '2025-12-01T09:00:00Z',
          scheduled_end: '2025-12-01T11:00:00Z',
          status: 'completed',
          description: 'Replaced leaking shutoff valve',
          urgency: 'medium',
          total_cost: 325,
        },
      ],
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'blue-collar-import-template.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: businessId }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding.')
      }

      localStorage.removeItem('onboarding_data')
      router.push('/admin/jobs')
    } catch (completeError: unknown) {
      setError(completeError instanceof Error ? completeError.message : 'Failed to complete onboarding.')
    } finally {
      setLoading(false)
    }
  }

  const canContinueStep2 = Boolean(selectedTrade) && services.some((service) => service.name.trim())

  const stepConfig = [
    { key: 1, label: 'Business' },
    { key: 2, label: 'Trade & Services' },
    { key: 3, label: 'Launch' },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-[-120px] bottom-[-180px] h-[460px] w-[460px] rounded-full bg-emerald-500/15 blur-[140px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 lg:py-10">
        <header className="mb-5 rounded-lg border border-slate-700 bg-slate-900/85 p-5 backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">Onboarding</p>
              <h1 className="mt-2 font-display text-5xl uppercase tracking-[0.08em] text-white">Set Up Workspace</h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 animate-pulse-glow-cyan">
              <Workflow className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {stepConfig.map((item) => (
              <div
                key={item.key}
                className={`rounded-md border px-3 py-2 text-sm ${
                  step >= item.key
                    ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                    : 'border-slate-700 bg-slate-950/70 text-slate-500'
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>
        </header>

        <section className="rounded-lg border border-slate-700 bg-slate-900/85 p-5 backdrop-blur sm:p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-[2px] border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan-300">
                <Building className="h-3.5 w-3.5" />
                Step 1 of 3
              </div>

              <div className="animate-fade-in-up">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Business address</label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main Street, Springfield"
                  className={inputClass}
                />
              </div>

              {address.trim() && (
                <div className="animate-fade-in-up">
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Google Calendar ID (optional)</label>
                  <input
                    type="text"
                    value={calendarId}
                    onChange={(event) => setCalendarId(event.target.value)}
                    placeholder="your-calendar@group.calendar.google.com"
                    className={inputClass}
                  />
                </div>
              )}

              {address.trim() && (
                <button type="button" onClick={handleStep1} disabled={loading} className={`${primaryBtnClass} animate-fade-in-up`}>
                  {loading ? 'Saving business...' : 'Continue'}
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-[2px] border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan-300">
                <Briefcase className="h-3.5 w-3.5" />
                Step 2 of 3
              </div>

              <div className="animate-fade-in-up">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">What trade does your business serve?</label>
                <select
                  value={selectedTrade}
                  onChange={(event) => handleTradeChange(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select trade type</option>
                  {TRADE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrade && (
                <div className="space-y-3 animate-fade-in-up">
                  <p className="text-sm text-slate-300">
                    Default services loaded for <span className="font-semibold text-cyan-300">{TRADE_PRESETS[selectedTrade].label}</span>. You can edit them.
                  </p>
                  <p className="text-xs text-slate-400">
                    Pricing and duration vary by job scope, so onboarding only captures service types.
                  </p>

                  {services.map((service, index) => (
                    <div key={`service-${index}`} className="rounded-md border border-slate-700 bg-slate-950/70 p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-slate-300">Service type {index + 1}</label>
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          disabled={services.length <= 1}
                          className="inline-flex h-8 items-center justify-center rounded-full border border-red-400/50 bg-red-500/10 px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-red-300 shadow-[0_0_14px_rgba(248,113,113,0.22)] transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        value={service.name}
                        onChange={(event) => updateService(index, event.target.value)}
                        placeholder="Service name"
                        className={inputClass}
                      />
                    </div>
                  ))}

                  <button type="button" onClick={addService} className={secondaryBtnClass}>
                    Add another service type
                  </button>

                  {!importCollapsed ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-cyan-300" />
                          <h3 className="text-base font-semibold text-slate-200">
                            Import previous jobs, clients, and technicians (optional)
                          </h3>
                        </div>
                        <button
                          onClick={downloadImportTemplate}
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Template
                        </button>
                      </div>

                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-600 bg-slate-900/60 px-4 py-6 text-center transition hover:border-cyan-400/50">
                        <Upload className="h-5 w-5 text-cyan-300" />
                        <span className="text-sm text-slate-200">
                          {importFile ? importFile.name : 'Upload CSV, Excel, or JSON'}
                        </span>
                        <span className="text-xs text-slate-400">Tap to choose file</span>
                        <input
                          type="file"
                          accept=".json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          className="hidden"
                          onChange={(event) => {
                            void handleImportFileSelect(event.target.files?.[0] || null)
                          }}
                        />
                      </label>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                          onClick={handleImportData}
                          type="button"
                          disabled={importLoading || !importFile}
                          className={primaryBtnClass}
                        >
                          {importLoading ? 'Importing data...' : 'Import now'}
                        </button>
                        <button type="button" onClick={handleSkipImport} className={secondaryBtnClass}>
                          Skip for now
                        </button>
                      </div>

                      {detectingTrade && <p className="mt-3 text-sm text-slate-300">Detecting trade from file...</p>}
                      {importHint && <p className="mt-2 text-sm text-slate-300">{importHint}</p>}

                      {importSummary && (
                        <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <p className="text-sm font-semibold text-emerald-300">
                            Imported {importSummary.customersImported} customers, {importSummary.techniciansImported}{' '}
                            technicians, and {importSummary.jobsImported} jobs.
                          </p>
                          <p className="text-sm text-emerald-200">
                            Skipped {importSummary.customersSkipped} customers, {importSummary.techniciansSkipped}{' '}
                            technicians, and {importSummary.jobsSkipped} jobs.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-300">Import skipped for now.</p>
                        <button
                          type="button"
                          onClick={() => setImportCollapsed(false)}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 px-4 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                        >
                          Reopen import
                        </button>
                      </div>
                    </div>
                  )}

                  {canContinueStep2 && (
                    <button type="button" onClick={handleStep2} disabled={loading} className={primaryBtnClass}>
                      {loading ? 'Saving services...' : 'Continue'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-[2px] border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Step 3 of 3
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
                <h3 className="text-base font-semibold text-slate-200">Ready to launch</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                    <p className="text-xs text-slate-400">Trade</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {selectedTrade ? TRADE_PRESETS[selectedTrade].label : 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                    <p className="text-xs text-slate-400">Services</p>
                    <p className="text-sm font-semibold text-slate-200">{services.length}</p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                    <p className="text-xs text-slate-400">Import</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {importSummary ? 'Completed' : importSkipped ? 'Skipped' : 'Not run'}
                    </p>
                  </div>
                </div>
              </div>

              <button type="button" onClick={handleComplete} disabled={loading} className={primaryBtnClass}>
                {loading ? 'Opening dashboard...' : 'Go to dashboard'}
              </button>

              <div>
                <Link href="/onboarding/import" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                  Open full import workspace
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
