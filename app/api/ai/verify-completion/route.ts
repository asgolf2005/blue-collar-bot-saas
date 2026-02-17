import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateCompletionVerification } from '@/lib/ai/completion-check'
import { checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

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

    const rateLimit = checkRateLimit(`${user.id}:ai:verify-completion`, 10, 60_000)
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
      .select('id, business_id, technician_id')
      .eq('id', jobId)
      .eq('business_id', profile.business_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (profile.role === 'tech' && job.technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await evaluateCompletionVerification({
      supabase,
      jobId,
      onAIUsage: (model, tokens) => trackAICost(user.id, model, tokens),
    })

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Completion verification error:', error)
    return NextResponse.json(
      { error: 'Completion verification failed. Please review manually.' },
      { status: 500 }
    )
  }
}
