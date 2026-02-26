import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { compactLines, parseJsonFromModel, withTimeout } from '@/lib/ai/utils'
import { checkCooldown, checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

interface AutoDocumentationModelResponse {
  title?: string
  summary?: string
  work_performed?: string[]
  evidence?: string[]
  invoice_blurb?: string
  follow_up?: string
}

const toList = (value: unknown, max = 6) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max)
}

const toBool = (value: unknown) => value === true || value === 'true' || value === '1'

const AI_AUTO_DOC_COOLDOWN_MS = 20_000

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      jobId?: string
      persist?: boolean
      isVisibleToCustomer?: boolean
    }

    const jobId = String(body.jobId || '').trim()
    const persist = toBool(body.persist)
    const isVisibleToCustomer = toBool(body.isVisibleToCustomer)

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.role !== 'admin' && profile.role !== 'tech') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimit = checkRateLimit(`${user.id}:ai:auto-documentation`, 6, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const cooldown = checkCooldown(`${user.id}:ai:auto-documentation:${jobId}`, AI_AUTO_DOC_COOLDOWN_MS)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Please wait ${cooldown.retryAfter}s before generating documentation again for this job.` },
        {
          status: 429,
          headers: { 'Retry-After': String(cooldown.retryAfter) },
        }
      )
    }

    const { data: job } = await supabase
      .from('jobs')
      .select(
        'id, business_id, technician_id, status, description, scheduled_start, scheduled_end, labor_hours, labor_rate, parts_cost, total_cost, customer_id'
      )
      .eq('id', jobId)
      .eq('business_id', profile.business_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (profile.role === 'tech' && job.technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (job.status !== 'in_progress' && job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Auto documentation is available after work has started.' },
        { status: 400 }
      )
    }

    const [
      { data: customer },
      { data: notes = [] },
      { data: media = [] },
      { data: serviceRows = [] },
      { data: invoice },
    ] = await Promise.all([
      job.customer_id
        ? supabase.from('customers').select('name').eq('id', job.customer_id).single()
        : Promise.resolve({ data: null as { name?: string } | null }),
      supabase
        .from('job_notes')
        .select('content, created_at')
        .eq('job_id', jobId)
        .eq('note_type', 'note')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('media').select('file_type').eq('job_id', jobId),
      supabase.from('job_services').select('service:services(name)').eq('job_id', jobId),
      supabase
        .from('invoices')
        .select('invoice_number, status, total')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const beforeCount = (media || []).filter((m: any) => m.file_type === 'before').length
    const duringCount = (media || []).filter((m: any) => m.file_type === 'during' || !m.file_type).length
    const afterCount = (media || []).filter((m: any) => m.file_type === 'after').length

    const serviceNames = (serviceRows || [])
      .map((row: any) => {
        const service = Array.isArray(row.service) ? row.service[0] : row.service
        return String(service?.name || '').trim()
      })
      .filter(Boolean)
      .slice(0, 6)

    const recentNotes = (notes || [])
      .map((note: any) => String(note.content || '').trim())
      .filter(Boolean)
      .slice(0, 6)

    if (recentNotes.length === 0 && (media || []).length === 0) {
      return NextResponse.json(
        { error: 'Add at least one note or photo before generating auto documentation.' },
        { status: 400 }
      )
    }

    const fallbackDocumentation = {
      title: 'Job Completion Summary',
      summary: `Service documentation for ${customer?.name || 'customer'} has been prepared from current job data.`,
      workPerformed: [
        job.description || 'Service performed as scheduled.',
        `Status at documentation time: ${job.status}.`,
      ],
      evidence: [
        `Before photos: ${beforeCount}`,
        `During photos: ${duringCount}`,
        `After photos: ${afterCount}`,
      ],
      invoiceBlurb: `Total recorded cost: ${typeof job.total_cost === 'number' ? `$${job.total_cost.toFixed(2)}` : 'not set'}.`,
      followUp: 'Confirm customer satisfaction and close any remaining punch-list items.',
      source: 'fallback' as const,
    }

    if (!isOpenAIConfigured || !openai) {
      const fallbackNote = compileDocumentationNote(fallbackDocumentation)
      return NextResponse.json({
        success: true,
        documentation: fallbackDocumentation,
        compiledNote: fallbackNote,
      })
    }

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: Models.FAST,
        temperature: 0.2,
        max_completion_tokens: 700,
        messages: [
          {
            role: 'system',
            content: [
              'You are Blue Collar Bot closeout documentation assistant.',
              'Generate concise, factual, invoice-ready job documentation.',
              'Return strict JSON only.',
              'Do not invent missing facts.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: compactLines([
              'Output schema:',
              '{',
              '  "title": "string",',
              '  "summary": "string",',
              '  "work_performed": ["string"],',
              '  "evidence": ["string"],',
              '  "invoice_blurb": "string",',
              '  "follow_up": "string"',
              '}',
              '',
              'Job context:',
              `- Customer: ${customer?.name || 'Unknown'}`,
              `- Status: ${job.status}`,
              `- Description: ${job.description || 'No description provided'}`,
              `- Scheduled Start: ${job.scheduled_start || 'Not set'}`,
              `- Scheduled End: ${job.scheduled_end || 'Not set'}`,
              `- Labor Hours: ${job.labor_hours ?? 'Not set'}`,
              `- Labor Rate: ${job.labor_rate ?? 'Not set'}`,
              `- Parts Cost: ${job.parts_cost ?? 'Not set'}`,
              `- Total Cost: ${job.total_cost ?? 'Not set'}`,
              `- Services: ${serviceNames.join(', ') || 'Not specified'}`,
              `- Photo Counts: before=${beforeCount}, during=${duringCount}, after=${afterCount}`,
              `- Invoice: ${
                invoice
                  ? `${invoice.invoice_number || 'N/A'} (${invoice.status || 'unknown'}) total=${invoice.total ?? 'N/A'}`
                  : 'none'
              }`,
              '',
              'Recent technician notes:',
              ...(recentNotes.length ? recentNotes.map((note) => `- ${note}`) : ['- none']),
            ]),
          },
        ],
      }),
      10_000,
      'Auto documentation request timed out'
    )
    trackAICost(user.id, Models.FAST, completion.usage?.total_tokens || 0)

    const parsed = parseJsonFromModel<AutoDocumentationModelResponse>(completion.choices[0]?.message?.content)
    const documentation = parsed
      ? {
          title: String(parsed.title || fallbackDocumentation.title).trim(),
          summary: String(parsed.summary || fallbackDocumentation.summary).trim(),
          workPerformed: toList(parsed.work_performed, 6),
          evidence: toList(parsed.evidence, 6),
          invoiceBlurb: String(parsed.invoice_blurb || fallbackDocumentation.invoiceBlurb).trim(),
          followUp: String(parsed.follow_up || fallbackDocumentation.followUp).trim(),
          source: 'ai' as const,
        }
      : fallbackDocumentation

    const normalizedDocumentation = {
      ...documentation,
      workPerformed: documentation.workPerformed.length ? documentation.workPerformed : fallbackDocumentation.workPerformed,
      evidence: documentation.evidence.length ? documentation.evidence : fallbackDocumentation.evidence,
    }

    const compiledNote = compileDocumentationNote(normalizedDocumentation)
    let note: Record<string, unknown> | null = null

    if (persist) {
      const { data: insertedNote, error: noteError } = await supabase
        .from('job_notes')
        .insert({
          job_id: jobId,
          user_id: user.id,
          note_type: 'note',
          content: compiledNote,
          is_visible_to_customer: isVisibleToCustomer,
          metadata: {
            source: 'auto_documentation_ai',
            model: Models.FAST,
          },
        })
        .select('*, user:users(id, full_name, email, role)')
        .single()

      if (noteError) {
        console.error('Auto documentation save error:', noteError)
      } else {
        note = insertedNote
      }
    }

    return NextResponse.json({
      success: true,
      documentation: normalizedDocumentation,
      compiledNote,
      note,
    })
  } catch (error) {
    console.error('Auto documentation AI error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auto documentation. Try again.' },
      { status: 500 }
    )
  }
}

function compileDocumentationNote(documentation: {
  title: string
  summary: string
  workPerformed: string[]
  evidence: string[]
  invoiceBlurb: string
  followUp: string
}) {
  return compactLines([
    documentation.title,
    '',
    'Summary',
    documentation.summary,
    '',
    'Work Performed',
    ...documentation.workPerformed.map((line) => `- ${line}`),
    '',
    'Evidence',
    ...documentation.evidence.map((line) => `- ${line}`),
    '',
    'Invoice Blurb',
    documentation.invoiceBlurb,
    '',
    'Follow Up',
    documentation.followUp,
  ])
}
