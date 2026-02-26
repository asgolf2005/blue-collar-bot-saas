import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { compactLines, parseJsonFromModel, withTimeout } from '@/lib/ai/utils'
import { checkCooldown, checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

type Priority = 'low' | 'medium' | 'high'
type JobStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

interface NextActionModelResponse {
  title?: string
  reason?: string
  priority?: Priority
  steps?: string[]
  status_suggestion?: JobStatus | 'none'
  customer_message?: string
}

const toList = (value: unknown, max = 4) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max)
}

const AI_NEXT_ACTION_COOLDOWN_MS = 12_000

function fallbackForStatus(status: string, scheduledStart?: string | null) {
  const now = Date.now()
  const scheduledMs = scheduledStart ? new Date(scheduledStart).getTime() : 0
  const minutesToStart = scheduledMs ? Math.round((scheduledMs - now) / 60000) : null

  if (status === 'scheduled') {
    if (typeof minutesToStart === 'number' && minutesToStart < 0) {
      return {
        title: 'Send delay update and head to site',
        reason: 'Scheduled start has passed. Immediate communication prevents escalation.',
        priority: 'high' as Priority,
        steps: [
          'Send ETA update to customer/dispatch now.',
          'Move to on_the_way when departing.',
          'Capture arrival proof and begin checklist.',
        ],
        statusSuggestion: 'on_the_way' as JobStatus,
        customerMessage: 'Running behind schedule. I am on the way now and will share updated ETA shortly.',
      }
    }
    return {
      title: 'Pre-stage and confirm access',
      reason: 'You are in scheduled state. Fast prep reduces first-visit delays.',
      priority: 'medium' as Priority,
      steps: [
        'Review scope, tools, and materials.',
        'Confirm customer access conditions.',
        'Switch to on_the_way when departing.',
      ],
      statusSuggestion: 'on_the_way' as JobStatus,
      customerMessage: 'I am preparing now and will be en route shortly.',
    }
  }

  if (status === 'on_the_way') {
    return {
      title: 'Confirm ETA and parking/access',
      reason: 'While en route, proactive ETA + access confirmation reduces idle time on arrival.',
      priority: 'medium' as Priority,
      steps: [
        'Send ETA if not already shared.',
        'Confirm parking/gate/unit details.',
        'Switch to arrived when on-site.',
      ],
      statusSuggestion: 'arrived' as JobStatus,
      customerMessage: 'I am en route and will arrive shortly. Please confirm access is ready.',
    }
  }

  if (status === 'arrived') {
    return {
      title: 'Start active work and baseline capture',
      reason: 'You are on-site. Moving into active work keeps timeline accurate.',
      priority: 'medium' as Priority,
      steps: [
        'Capture before condition evidence.',
        'Confirm issue scope with customer.',
        'Move status to in_progress when tools are out.',
      ],
      statusSuggestion: 'in_progress' as JobStatus,
      customerMessage: 'I have arrived and am starting the service assessment now.',
    }
  }

  if (status === 'in_progress') {
    return {
      title: 'Document completion evidence',
      reason: 'Work is active. Structured documentation avoids closeout delays.',
      priority: 'high' as Priority,
      steps: [
        'Capture during/after photos.',
        'Log parts, time, and customer-facing notes.',
        'Complete verification before closing the job.',
      ],
      statusSuggestion: 'completed' as JobStatus,
      customerMessage: 'Work is in progress. I will share completion details once final checks are done.',
    }
  }

  return {
    title: 'Monitor and close documentation',
    reason: 'No immediate action required beyond documentation hygiene.',
    priority: 'low' as Priority,
    steps: ['Review job notes and ensure all evidence is attached.'],
    statusSuggestion: 'none' as const,
    customerMessage: '',
  }
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

    const rateLimit = checkRateLimit(`${user.id}:ai:next-action`, 12, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const cooldown = checkCooldown(`${user.id}:ai:next-action:${jobId}`, AI_NEXT_ACTION_COOLDOWN_MS)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Please wait ${cooldown.retryAfter}s before requesting another next action for this job.` },
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

    if (job.status === 'cancelled' || job.status === 'completed') {
      return NextResponse.json(
        { error: 'Next action is only available for active jobs.' },
        { status: 400 }
      )
    }

    const [{ data: customer }, { data: notes = [] }, { data: media = [] }] = await Promise.all([
      job.customer_id
        ? supabase.from('customers').select('name').eq('id', job.customer_id).single()
        : Promise.resolve({ data: null as { name?: string } | null }),
      supabase
        .from('job_notes')
        .select('content, created_at')
        .eq('job_id', jobId)
        .eq('note_type', 'note')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('media').select('id, file_type').eq('job_id', jobId).limit(20),
    ])

    const fallback = fallbackForStatus(job.status, job.scheduled_start)

    if (!isOpenAIConfigured || !openai) {
      return NextResponse.json({ success: true, action: fallback })
    }

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: Models.FAST,
        temperature: 0.2,
        max_completion_tokens: 450,
        messages: [
          {
            role: 'system',
            content: [
              'You are Blue Collar Bot field execution copilot.',
              'Generate the single highest-impact next action.',
              'Output strict JSON only.',
              'Avoid vague statements.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: compactLines([
              'Output schema:',
              '{',
              '  "title": "string",',
              '  "reason": "string",',
              '  "priority": "low|medium|high",',
              '  "steps": ["string"],',
              '  "status_suggestion": "scheduled|on_the_way|arrived|in_progress|completed|cancelled|none",',
              '  "customer_message": "string"',
              '}',
              '',
              'Job context:',
              `- Status: ${job.status}`,
              `- Urgency: ${job.urgency || 'normal'}`,
              `- Description: ${job.description || 'No description provided'}`,
              `- Scheduled Start: ${job.scheduled_start || 'Not set'}`,
              `- Scheduled End: ${job.scheduled_end || 'Not set'}`,
              `- Customer: ${customer?.name || 'Unknown'}`,
              `- Media Items: ${(media || []).length}`,
              '',
              'Latest notes:',
              ...((notes || []).map((note: any) => `- ${String(note.content || '').slice(0, 220)}`) || ['- none']),
            ]),
          },
        ],
      }),
      10_000,
      'Next action request timed out'
    )
    trackAICost(user.id, Models.FAST, completion.usage?.total_tokens || 0)

    const parsed = parseJsonFromModel<NextActionModelResponse>(completion.choices[0]?.message?.content)
    if (!parsed) {
      return NextResponse.json({ success: true, action: fallback })
    }

    const priority = parsed.priority === 'high' || parsed.priority === 'medium' || parsed.priority === 'low'
      ? parsed.priority
      : fallback.priority

    const statusSuggestion =
      parsed.status_suggestion === 'scheduled' ||
      parsed.status_suggestion === 'on_the_way' ||
      parsed.status_suggestion === 'arrived' ||
      parsed.status_suggestion === 'in_progress' ||
      parsed.status_suggestion === 'completed' ||
      parsed.status_suggestion === 'cancelled' ||
      parsed.status_suggestion === 'none'
        ? parsed.status_suggestion
        : fallback.statusSuggestion

    return NextResponse.json({
      success: true,
      action: {
        title: String(parsed.title || fallback.title).trim(),
        reason: String(parsed.reason || fallback.reason).trim(),
        priority,
        steps: toList(parsed.steps, 4).length ? toList(parsed.steps, 4) : fallback.steps,
        statusSuggestion,
        customerMessage: String(parsed.customer_message || fallback.customerMessage || '').trim(),
      },
    })
  } catch (error) {
    console.error('Next action AI error:', error)
    return NextResponse.json(
      { error: 'Failed to generate next action. Try again.' },
      { status: 500 }
    )
  }
}
