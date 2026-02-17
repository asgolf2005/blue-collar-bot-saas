import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { compactLines, withTimeout } from '@/lib/ai/utils'
import { checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

type ChatRole = 'user' | 'assistant'

interface TroubleshootHistoryMessage {
  role: ChatRole
  content: string
}

interface TroubleshootRequestBody {
  jobId?: string
  message?: string
  history?: TroubleshootHistoryMessage[]
  persist?: boolean
}

const normalizeHistory = (value: TroubleshootRequestBody['history']) => {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is TroubleshootHistoryMessage => Boolean(entry && typeof entry.content === 'string'))
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-10)
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

    const body = (await request.json()) as TroubleshootRequestBody
    const jobId = String(body.jobId || '').trim()
    const message = String(body.message || '').trim()
    const history = normalizeHistory(body.history)
    const persist = body.persist === true

    if (!jobId || !message) {
      return NextResponse.json({ error: 'Missing jobId or message' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const rateLimit = checkRateLimit(`${user.id}:ai:troubleshoot`, 10, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
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

    if (!isOpenAIConfigured || !openai) {
      return NextResponse.json(
        { error: 'AI troubleshooting is unavailable. Use manual diagnostic workflow.' },
        { status: 503 }
      )
    }

    let customerName = 'Unknown'
    if (job.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', job.customer_id)
        .single()

      if (customer?.name) {
        customerName = customer.name
      }
    }

    const { data: recentNotes } = await supabase
      .from('job_notes')
      .select('content, note_type, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(4)

    const notesContext = (recentNotes || [])
      .map((note) => `- [${note.note_type}] ${note.content}`)
      .join('\n')

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: Models.FAST,
        temperature: 0.3,
        max_completion_tokens: 700,
        messages: [
          {
            role: 'system',
            content: [
              'You are Blue Collar Bot troubleshooting assistant for field technicians.',
              'Give concise, practical diagnostics with safety-first steps.',
              'Always respond in this structure:',
              '1) Most likely causes (top 3)',
              '2) Step-by-step checks (numbered)',
              '3) Immediate safety warnings (if any)',
              '4) Escalation point ("Call dispatch when ...")',
              'Never claim certainty when symptoms are ambiguous.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: compactLines([
              'Job context:',
              `- Customer: ${customerName}`,
              `- Status: ${job.status}`,
              `- Urgency: ${job.urgency || 'normal'}`,
              `- Description: ${job.description || 'No description provided'}`,
              '',
              'Recent notes:',
              notesContext || '- No recent notes',
            ]),
          },
          ...history.map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
          {
            role: 'user',
            content: message,
          },
        ],
      }),
      10_000,
      'Troubleshooting request timed out'
    )
    trackAICost(user.id, Models.FAST, completion.usage?.total_tokens || 0)

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'I could not generate troubleshooting guidance right now. Please use manual diagnostics.'

    if (persist) {
      const content = compactLines([
        'AI Troubleshooting Session',
        '',
        `Symptom: ${message}`,
        '',
        'Guidance:',
        reply,
      ])

      const { error: insertError } = await supabase.from('job_notes').insert({
        job_id: jobId,
        user_id: user.id,
        note_type: 'note',
        content,
        is_visible_to_customer: false,
        metadata: {
          source: 'troubleshoot_ai',
          user_prompt: message,
          model: Models.FAST,
        },
      })

      if (insertError) {
        console.error('Troubleshoot note save failed:', insertError)
      }
    }

    return NextResponse.json({
      success: true,
      reply,
    })
  } catch (error) {
    console.error('Troubleshoot AI error:', error)
    return NextResponse.json(
      { error: 'Troubleshooting failed. Continue with manual diagnostics.' },
      { status: 500 }
    )
  }
}
