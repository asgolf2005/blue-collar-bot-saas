import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { compactLines, parseJsonFromModel, withTimeout } from '@/lib/ai/utils'
import { checkCooldown, checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

interface JobBriefResponse {
  summary?: string
  first_action?: string
  risks?: string[]
  checklist?: string[]
  customer_notes?: string[]
}

const toList = (value: unknown, max = 5) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max)
}

const AI_JOB_BRIEF_COOLDOWN_MS = 15_000

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { jobId?: string }
    const jobId = String(body.jobId || '').trim()
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

    const rateLimit = checkRateLimit(`${user.id}:ai:job-brief`, 8, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const cooldown = checkCooldown(`${user.id}:ai:job-brief:${jobId}`, AI_JOB_BRIEF_COOLDOWN_MS)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Please wait ${cooldown.retryAfter}s before generating another brief for this job.` },
        {
          status: 429,
          headers: { 'Retry-After': String(cooldown.retryAfter) },
        }
      )
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, business_id, technician_id, status, description, urgency, scheduled_start, scheduled_end, customer_id')
      .eq('id', jobId)
      .eq('business_id', profile.business_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (profile.role === 'tech' && job.technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [{ data: customer }, { data: notes = [] }, { data: jobServices = [] }] = await Promise.all([
      job.customer_id
        ? supabase.from('customers').select('name, phone, address').eq('id', job.customer_id).single()
        : Promise.resolve({ data: null as { name?: string; phone?: string; address?: string } | null }),
      supabase
        .from('job_notes')
        .select('content, created_at')
        .eq('job_id', jobId)
        .eq('note_type', 'note')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('job_services').select('service:services(name)').eq('job_id', jobId),
    ])

    const serviceNames = (jobServices || [])
      .map((row: any) => {
        const service = Array.isArray(row.service) ? row.service[0] : row.service
        return String(service?.name || '').trim()
      })
      .filter(Boolean)
      .slice(0, 6)

    if (job.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This job is cancelled. Job brief is unavailable.' },
        { status: 400 }
      )
    }

    if (!String(job.description || '').trim() && serviceNames.length === 0) {
      return NextResponse.json(
        { error: 'Add a job description or linked service before generating a brief.' },
        { status: 400 }
      )
    }

    const recentNotes = (notes || [])
      .map((note: any) => String(note.content || '').trim())
      .filter(Boolean)
      .slice(0, 4)

    const fallbackBrief = {
      summary: `Prepare for ${customer?.name || 'this customer'}: ${job.description || 'service call'}.`,
      firstAction: 'Review scope, confirm access and safety conditions, then begin baseline checks.',
      risks: [
        'Scope details may be incomplete on first arrival.',
        'On-site conditions can require material or timing adjustments.',
      ],
      checklist: [
        'Confirm customer access and workspace readiness.',
        'Capture before-state evidence photos.',
        'Validate required parts/tools before starting.',
      ],
      customerNotes: [customer?.address ? `Address: ${customer.address}` : 'Address not provided.'],
      source: 'fallback' as const,
    }

    if (!isOpenAIConfigured || !openai) {
      return NextResponse.json({
        success: true,
        brief: fallbackBrief,
      })
    }

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: Models.FAST,
        temperature: 0.25,
        max_completion_tokens: 500,
        messages: [
          {
            role: 'system',
            content: [
              'You are Blue Collar Bot field ops copilot.',
              'Create a concise pre-job brief for a technician.',
              'Return STRICT JSON only.',
              'Never fabricate specifics.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: compactLines([
              'Output schema:',
              '{',
              '  "summary": "string",',
              '  "first_action": "string",',
              '  "risks": ["string"],',
              '  "checklist": ["string"],',
              '  "customer_notes": ["string"]',
              '}',
              '',
              'Context:',
              `- Status: ${job.status}`,
              `- Urgency: ${job.urgency || 'normal'}`,
              `- Description: ${job.description || 'No description provided'}`,
              `- Scheduled Start: ${job.scheduled_start || 'Not set'}`,
              `- Scheduled End: ${job.scheduled_end || 'Not set'}`,
              `- Customer Name: ${customer?.name || 'Unknown'}`,
              `- Customer Phone: ${customer?.phone || 'Unknown'}`,
              `- Customer Address: ${customer?.address || 'Unknown'}`,
              `- Services: ${serviceNames.join(', ') || 'Not specified'}`,
              '',
              'Recent notes:',
              ...(recentNotes.length ? recentNotes.map((note) => `- ${note}`) : ['- none']),
            ]),
          },
        ],
      }),
      10_000,
      'Job brief request timed out'
    )
    trackAICost(user.id, Models.FAST, completion.usage?.total_tokens || 0)

    const parsed = parseJsonFromModel<JobBriefResponse>(completion.choices[0]?.message?.content)
    if (!parsed) {
      return NextResponse.json({ success: true, brief: fallbackBrief })
    }

    const brief = {
      summary: String(parsed.summary || fallbackBrief.summary).trim(),
      firstAction: String(parsed.first_action || fallbackBrief.firstAction).trim(),
      risks: toList(parsed.risks, 4),
      checklist: toList(parsed.checklist, 6),
      customerNotes: toList(parsed.customer_notes, 4),
      source: 'ai' as const,
    }

    return NextResponse.json({
      success: true,
      brief,
    })
  } catch (error) {
    console.error('Job brief AI error:', error)
    return NextResponse.json(
      { error: 'Failed to build AI job brief. Try again.' },
      { status: 500 }
    )
  }
}
