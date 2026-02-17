import { NextResponse } from 'next/server'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024

const importPayloadSchema = z.object({
  customers: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        phone: z.string().trim().min(1).max(50),
        email: z.string().trim().email().optional().or(z.literal('')),
        address: z.string().trim().max(500).optional().or(z.literal('')),
      })
    )
    .default([]),
  jobs: z
    .array(
      z.object({
        customer_email: z.string().trim().email().optional().or(z.literal('')),
        customer_phone: z.string().trim().optional().or(z.literal('')),
        customer_name: z.string().trim().optional().or(z.literal('')),
        scheduled_start: z.string().trim().min(1),
        scheduled_end: z.string().trim().optional().or(z.literal('')),
        status: z
          .enum(['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'])
          .optional(),
        description: z.string().trim().max(1000).optional().or(z.literal('')),
        urgency: z.string().trim().max(50).optional().or(z.literal('')),
        total_cost: z.union([z.number(), z.string()]).optional(),
        parts_cost: z.union([z.number(), z.string()]).optional(),
        labor_hours: z.union([z.number(), z.string()]).optional(),
        labor_rate: z.union([z.number(), z.string()]).optional(),
      })
    )
    .default([]),
})

type ImportPayload = z.infer<typeof importPayloadSchema>
type FlatRow = Record<string, string>

function normalizeEmail(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function normalizePhone(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '')
}

function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function parseOptionalNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIsoDate(value: string | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function addOneHour(isoDate: string): string {
  const date = new Date(isoDate)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

function normalizeHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toFlatRow(input: Record<string, unknown>): FlatRow {
  const row: FlatRow = {}
  for (const [key, value] of Object.entries(input)) {
    const normalized = normalizeHeaderKey(key)
    if (!normalized) continue
    row[normalized] =
      value === null || value === undefined ? '' : typeof value === 'string' ? value.trim() : String(value)
  }
  return row
}

function pickFirst(row: FlatRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function mapRowToCustomer(row: FlatRow) {
  return {
    name: pickFirst(row, ['name', 'customer_name', 'full_name', 'company', 'company_name']),
    phone: pickFirst(row, ['phone', 'customer_phone', 'phone_number', 'mobile', 'mobile_phone']),
    email: pickFirst(row, ['email', 'customer_email']),
    address: pickFirst(row, ['address', 'customer_address', 'street', 'location']),
  }
}

function mapRowToJob(row: FlatRow) {
  return {
    customer_email: pickFirst(row, ['customer_email', 'email']),
    customer_phone: pickFirst(row, ['customer_phone', 'phone', 'phone_number', 'mobile']),
    customer_name: pickFirst(row, ['customer_name', 'name', 'company', 'company_name']),
    scheduled_start: pickFirst(row, ['scheduled_start', 'start', 'start_time', 'scheduled_date', 'date']),
    scheduled_end: pickFirst(row, ['scheduled_end', 'end', 'end_time']),
    status: pickFirst(row, ['status', 'job_status']) as ImportPayload['jobs'][number]['status'],
    description: pickFirst(row, ['description', 'job_description', 'notes']),
    urgency: pickFirst(row, ['urgency', 'priority']),
    total_cost: pickFirst(row, ['total_cost', 'total', 'amount', 'price']),
    parts_cost: pickFirst(row, ['parts_cost', 'materials_cost']),
    labor_hours: pickFirst(row, ['labor_hours', 'hours']),
    labor_rate: pickFirst(row, ['labor_rate', 'hourly_rate']),
  }
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

function parseCsvRows(text: string): FlatRow[] {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '')
  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return []
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeaderKey)
  const rows: FlatRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i])
    const row: FlatRow = {}

    headers.forEach((header, index) => {
      if (!header) return
      row[header] = values[index] ?? ''
    })

    rows.push(row)
  }

  return rows
}

function rowsToPayload(rows: FlatRow[]): ImportPayload {
  const payload: ImportPayload = { customers: [], jobs: [] }
  if (rows.length === 0) {
    return payload
  }

  const hasRecordType = rows.some((row) => !!row.record_type)
  if (hasRecordType) {
    for (const row of rows) {
      const type = (row.record_type || '').trim().toLowerCase()
      if (type === 'customer' || type === 'customers') {
        payload.customers.push(mapRowToCustomer(row))
      } else if (type === 'job' || type === 'jobs') {
        payload.jobs.push(mapRowToJob(row))
      }
    }
    return payload
  }

  for (const row of rows) {
    const looksLikeJob = !!pickFirst(row, ['scheduled_start', 'start', 'start_time', 'scheduled_date', 'date'])
    if (looksLikeJob) {
      payload.jobs.push(mapRowToJob(row))
    } else {
      payload.customers.push(mapRowToCustomer(row))
    }
  }

  return payload
}

function rowsFromXlsxSheet(workbook: XLSX.WorkBook, sheetName: string): FlatRow[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  return rawRows.map(toFlatRow)
}

function parseXlsxPayload(fileBuffer: Buffer): ImportPayload {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const lowerToActual = new Map<string, string>()
  for (const name of workbook.SheetNames) {
    lowerToActual.set(name.trim().toLowerCase(), name)
  }

  const customersSheet =
    lowerToActual.get('customers') || lowerToActual.get('customer') || lowerToActual.get('clients')
  const jobsSheet =
    lowerToActual.get('jobs') ||
    lowerToActual.get('job') ||
    lowerToActual.get('work_orders') ||
    lowerToActual.get('workorders')

  if (customersSheet || jobsSheet) {
    const payload: ImportPayload = { customers: [], jobs: [] }
    if (customersSheet) {
      payload.customers = rowsFromXlsxSheet(workbook, customersSheet).map(mapRowToCustomer)
    }
    if (jobsSheet) {
      payload.jobs = rowsFromXlsxSheet(workbook, jobsSheet).map(mapRowToJob)
    }
    return payload
  }

  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return { customers: [], jobs: [] }

  return rowsToPayload(rowsFromXlsxSheet(workbook, firstSheet))
}

function validatePayload(payload: ImportPayload): ImportPayload {
  const validated = importPayloadSchema.safeParse(payload)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    throw new Error(`Invalid import file format: ${firstIssue.path.join('.')} ${firstIssue.message}`)
  }

  return validated.data
}

async function parseImportFile(file: File): Promise<ImportPayload> {
  const filename = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()

  const isJson = filename.endsWith('.json') || fileType.includes('json')
  if (isJson) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      throw new Error('Could not parse JSON file.')
    }
    return validatePayload(parsed as ImportPayload)
  }

  const isCsv = filename.endsWith('.csv') || fileType.includes('csv')
  if (isCsv) {
    const rows = parseCsvRows(await file.text())
    return validatePayload(rowsToPayload(rows))
  }

  const isExcel =
    filename.endsWith('.xlsx') ||
    filename.endsWith('.xls') ||
    fileType.includes('spreadsheetml') ||
    fileType.includes('excel')
  if (isExcel) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return validatePayload(parseXlsxPayload(buffer))
  }

  throw new Error('Unsupported file type. Please upload JSON, CSV, XLSX, or XLS.')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please upload a file.' }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 })
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5MB upload limit.' }, { status: 413 })
    }

    const payload = await parseImportFile(file)
    if (payload.customers.length === 0 && payload.jobs.length === 0) {
      return NextResponse.json(
        { error: 'Import file has no customers or jobs.' },
        { status: 400 }
      )
    }

    const { data: existingCustomers, error: existingCustomersError } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', profile.business_id)

    if (existingCustomersError) {
      throw existingCustomersError
    }

    const customerByEmail = new Map<string, string>()
    const customerByPhone = new Map<string, string>()
    const customerByName = new Map<string, string>()

    for (const customer of existingCustomers || []) {
      const emailKey = normalizeEmail(customer.email)
      const phoneKey = normalizePhone(customer.phone)
      const nameKey = normalizeName(customer.name)
      if (emailKey) customerByEmail.set(emailKey, customer.id)
      if (phoneKey) customerByPhone.set(phoneKey, customer.id)
      if (nameKey) customerByName.set(nameKey, customer.id)
    }

    const summary = {
      customersImported: 0,
      customersSkipped: 0,
      jobsImported: 0,
      jobsSkipped: 0,
      errors: [] as string[],
    }

    const addError = (message: string) => {
      if (summary.errors.length < 50) {
        summary.errors.push(message)
      }
    }

    for (const [index, customer] of payload.customers.entries()) {
      const name = customer.name.trim()
      const phone = customer.phone.trim()
      const email = normalizeEmail(customer.email)
      const address = (customer.address || '').trim()

      const existingId =
        (email ? customerByEmail.get(email) : undefined) ||
        (phone ? customerByPhone.get(normalizePhone(phone)) : undefined) ||
        customerByName.get(normalizeName(name))

      if (existingId) {
        summary.customersSkipped += 1
        continue
      }

      const { data: insertedCustomer, error: insertCustomerError } = await supabase
        .from('customers')
        .insert({
          business_id: profile.business_id,
          name,
          phone,
          email: email || null,
          address: address || null,
        })
        .select('id, name, email, phone')
        .single()

      if (insertCustomerError || !insertedCustomer) {
        summary.customersSkipped += 1
        addError(`Customer row ${index + 1}: ${insertCustomerError?.message || 'Insert failed'}`)
        continue
      }

      summary.customersImported += 1
      const insertedEmail = normalizeEmail(insertedCustomer.email)
      const insertedPhone = normalizePhone(insertedCustomer.phone)
      const insertedName = normalizeName(insertedCustomer.name)
      if (insertedEmail) customerByEmail.set(insertedEmail, insertedCustomer.id)
      if (insertedPhone) customerByPhone.set(insertedPhone, insertedCustomer.id)
      if (insertedName) customerByName.set(insertedName, insertedCustomer.id)
    }

    for (const [index, job] of payload.jobs.entries()) {
      const customerId =
        (job.customer_email ? customerByEmail.get(normalizeEmail(job.customer_email)) : undefined) ||
        (job.customer_phone ? customerByPhone.get(normalizePhone(job.customer_phone)) : undefined) ||
        (job.customer_name ? customerByName.get(normalizeName(job.customer_name)) : undefined)

      if (!customerId) {
        summary.jobsSkipped += 1
        addError(`Job row ${index + 1}: Could not match customer by email, phone, or name.`)
        continue
      }

      const scheduledStart = toIsoDate(job.scheduled_start)
      if (!scheduledStart) {
        summary.jobsSkipped += 1
        addError(`Job row ${index + 1}: Invalid scheduled_start.`)
        continue
      }

      let scheduledEnd = toIsoDate(job.scheduled_end)
      if (!scheduledEnd) {
        scheduledEnd = addOneHour(scheduledStart)
      }
      if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
        scheduledEnd = addOneHour(scheduledStart)
      }

      const status = job.status || (new Date(scheduledStart) < new Date() ? 'completed' : 'scheduled')

      const { error: insertJobError } = await supabase.from('jobs').insert({
        business_id: profile.business_id,
        customer_id: customerId,
        source: 'manual',
        status,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        description: (job.description || '').trim() || null,
        urgency: (job.urgency || '').trim() || null,
        total_cost: parseOptionalNumber(job.total_cost),
        parts_cost: parseOptionalNumber(job.parts_cost),
        labor_hours: parseOptionalNumber(job.labor_hours),
        labor_rate: parseOptionalNumber(job.labor_rate),
      })

      if (insertJobError) {
        summary.jobsSkipped += 1
        addError(`Job row ${index + 1}: ${insertJobError.message}`)
        continue
      }

      summary.jobsImported += 1
    }

    return NextResponse.json({ success: true, summary })
  } catch (error: any) {
    console.error('Onboarding import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import onboarding data' },
      { status: 500 }
    )
  }
}
