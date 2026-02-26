import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { compactLines, parseJsonFromModel, withTimeout } from '@/lib/ai/utils'
import { checkCooldown, checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024
const AI_VOICE_COPILOT_COOLDOWN_MS = 10_000

type JobStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

interface VoiceCopilotModelResponse {
  formatted_note?: string
  suggested_status?: JobStatus | 'none'
  status_reason?: string
  customer_update?: string
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

    const formData = await request.formData()
    const jobId = String(formData.get('jobId') || '').trim()
    const audio = formData.get('audio')

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
    }

    if (audio.size <= 0 || audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Audio file size is invalid. Keep recordings under 15 MB.' },
        { status: 400 }
      )
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

    const rateLimit = checkRateLimit(`${user.id}:ai:voice-copilot`, 8, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const cooldown = checkCooldown(`${user.id}:ai:voice-copilot:${jobId}`, AI_VOICE_COPILOT_COOLDOWN_MS)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Please wait ${cooldown.retryAfter}s before sending another voice request for this job.` },
        {
          status: 429,
          headers: { 'Retry-After': String(cooldown.retryAfter) },
        }
      )
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, business_id, technician_id, status, description, urgency, customer_id')
      .eq('id', jobId)
      .eq('business_id', profile.business_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (profile.role === 'tech' && job.technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (job.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Voice copilot is unavailable for cancelled jobs.' },
        { status: 400 }
      )
    }

    if (!isOpenAIConfigured || !openai) {
      return NextResponse.json(
        { error: 'AI voice copilot unavailable. Use manual notes.' },
        { status: 503 }
      )
    }

    const { data: customer } = job.customer_id
      ? await supabase.from('customers').select('name').eq('id', job.customer_id).single()
      : { data: null as { name?: string } | null }

    const transcription = await withTimeout(
      openai.audio.transcriptions.create({
        model: Models.WHISPER,
        file: audio,
        response_format: 'text',
      }),
      10_000,
      'Voice transcription timed out'
    )

    const transcript = typeof transcription === 'string' ? transcription.trim() : ''
    const transcriptionTokens =
      typeof transcription === 'string'
        ? 0
        : Number((transcription as { usage?: { total_tokens?: number } }).usage?.total_tokens || 0)
    trackAICost(user.id, Models.WHISPER, transcriptionTokens)

    if (!transcript) {
      return NextResponse.json({ error: 'No speech detected. Try again.' }, { status: 422 })
    }

    if (transcript.length < 8) {
      return NextResponse.json(
        { error: 'Voice input is too short. Please provide more detail.' },
        { status: 422 }
      )
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
              'You are Blue Collar Bot voice copilot.',
              'Convert rough dictation into actionable field output.',
              'Return strict JSON only.',
              'Never invent measurements or outcomes.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: compactLines([
              'Output schema:',
              '{',
              '  "formatted_note": "string",',
              '  "suggested_status": "scheduled|on_the_way|arrived|in_progress|completed|cancelled|none",',
              '  "status_reason": "string",',
              '  "customer_update": "string"',
              '}',
              '',
              'Context:',
              `- Current status: ${job.status}`,
              `- Job description: ${job.description || 'General service call'}`,
              `- Urgency: ${job.urgency || 'normal'}`,
              `- Customer: ${customer?.name || 'Unknown customer'}`,
              '',
              'Dictation transcript:',
              transcript,
            ]),
          },
        ],
      }),
      10_000,
      'Voice copilot formatting timed out'
    )
    trackAICost(user.id, Models.FAST, completion.usage?.total_tokens || 0)

    const parsed = parseJsonFromModel<VoiceCopilotModelResponse>(completion.choices[0]?.message?.content)

    const suggestedStatus =
      parsed?.suggested_status === 'scheduled' ||
      parsed?.suggested_status === 'on_the_way' ||
      parsed?.suggested_status === 'arrived' ||
      parsed?.suggested_status === 'in_progress' ||
      parsed?.suggested_status === 'completed' ||
      parsed?.suggested_status === 'cancelled' ||
      parsed?.suggested_status === 'none'
        ? parsed.suggested_status
        : 'none'

    return NextResponse.json({
      success: true,
      transcript,
      formattedNote: String(parsed?.formatted_note || transcript).trim(),
      suggestedStatus,
      statusReason: String(parsed?.status_reason || '').trim(),
      customerUpdate: String(parsed?.customer_update || '').trim(),
    })
  } catch (error) {
    console.error('Voice copilot AI error:', error)
    return NextResponse.json(
      { error: 'Voice copilot failed. Try again.' },
      { status: 500 }
    )
  }
}
