import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { compactLines, withTimeout } from '@/lib/ai/utils'

type VoiceMode = 'job_note' | 'transcript'

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB

const toBoolean = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return false
  return value === '1' || value.toLowerCase() === 'true'
}

const normalizeMode = (value: FormDataEntryValue | null): VoiceMode =>
  value === 'transcript' ? 'transcript' : 'job_note'

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
    const audio = formData.get('audio')
    const jobId = String(formData.get('jobId') || '').trim()
    const mode = normalizeMode(formData.get('mode'))
    const saveToJobNotes = toBoolean(formData.get('save'))
    const isVisibleToCustomer = toBoolean(formData.get('isVisibleToCustomer'))

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

    const { data: job } = await supabase
      .from('jobs')
      .select('id, business_id, technician_id, scheduled_start, scheduled_end, description')
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
        { error: 'AI unavailable. Add notes manually.' },
        { status: 503 }
      )
    }

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

    if (!transcript) {
      return NextResponse.json({ error: 'No speech detected. Try again.' }, { status: 422 })
    }

    if (mode === 'transcript') {
      return NextResponse.json({
        success: true,
        mode,
        transcript,
      })
    }

    const formattingCompletion = await withTimeout(
      openai.chat.completions.create({
        model: Models.FAST,
        temperature: 0.2,
        max_completion_tokens: 350,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert field service documentation assistant. Convert rough voice dictation into concise, professional technician job notes. Use plain text sections and keep factual details only.',
          },
          {
            role: 'user',
            content: compactLines([
              'Format this dictation into a professional job note.',
              'Use these sections exactly in this order:',
              'REPAIRS COMPLETED',
              'CUSTOMER INTERACTION',
              'TIME LOGGED',
              'JOB STATUS',
              '',
              'Rules:',
              '- Use short bullet points prefixed with "•".',
              '- Keep uncertain details clearly marked as "estimated".',
              '- Do not invent part numbers, measurements, or outcomes.',
              '',
              `Job context: ${job.description || 'General service call'}`,
              '',
              `Dictation:\n${transcript}`,
            ]),
          },
        ],
      }),
      10_000,
      'Voice note formatting timed out'
    )

    const formattedNoteRaw = formattingCompletion.choices[0]?.message?.content || ''
    const formattedNote = formattedNoteRaw.trim() || transcript

    let note: Record<string, unknown> | null = null
    if (saveToJobNotes) {
      const { data: insertedNote, error: noteError } = await supabase
        .from('job_notes')
        .insert({
          job_id: jobId,
          user_id: user.id,
          note_type: 'note',
          content: formattedNote,
          is_visible_to_customer: isVisibleToCustomer,
          metadata: {
            source: 'voice_note_ai',
            transcript,
            model: Models.FAST,
          },
        })
        .select('*, user:users(id, full_name, email, role)')
        .single()

      if (noteError) {
        console.error('Voice note save error:', noteError)
      } else {
        note = insertedNote
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      transcript,
      formattedNote,
      note,
    })
  } catch (error) {
    console.error('Voice notes AI error:', error)
    return NextResponse.json(
      { error: 'AI processing failed. Type your note manually.' },
      { status: 500 }
    )
  }
}
