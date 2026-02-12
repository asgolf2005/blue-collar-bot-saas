import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendJobStatusSMS, sendTechnicianAssignedSMS } from '@/lib/sms/job-notifications'

type AssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

const MAX_MESSAGES = 12
const MAX_TOOL_LOOPS = 2
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_LIMIT = 8

const ALLOWED_STATUSES = ['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'] as const

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const buildSystemPrompt = (
  businessName: string | null,
  userName: string | null,
  timeContext: { localDate?: string | null; timezoneOffsetMinutes?: number | null }
) => {
  const name = userName || 'Admin'
  const business = businessName ? ` for ${businessName}` : ''
  const localDate = timeContext.localDate ? `Local date: ${timeContext.localDate}.` : ''
  const offset =
    typeof timeContext.timezoneOffsetMinutes === 'number'
      ? `Timezone offset minutes: ${timeContext.timezoneOffsetMinutes}.`
      : ''
  return [
    `You are Blue Collar Bot's admin assistant${business}.`,
    `Address the user as ${name} when helpful.`,
    'Be concise, practical, and action-oriented.',
    'If details are missing for an action, ask a short clarifying question.',
    'Only take actions when the user explicitly asks.',
    'When referencing a page or record, include a short route like /admin/jobs/new or /admin/jobs/{id}.',
    'If a user asks about "today", "tomorrow", or a specific date, call list_jobs_for_day with the local date and timezone offset.',
    localDate,
    offset,
    'Do not invent data; suggest where in the UI to find it.',
  ].join(' ')
}

const normalizeMessages = (messages: unknown) => {
  if (!Array.isArray(messages)) {
    return []
  }
  return messages
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      role: (item as AssistantMessage).role,
      content: (item as AssistantMessage).content,
    }))
    .filter((item) => (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'list_jobs_for_day',
      description: 'List jobs for a specific local day, with optional status filter.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Local date in YYYY-MM-DD format' },
          timezone_offset_minutes: { type: 'integer', description: 'Minutes offset from UTC' },
          status: { type: 'string', enum: [...ALLOWED_STATUSES] },
          limit: { type: 'integer', minimum: 1, maximum: 25 },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_jobs',
      description: 'List jobs for the business with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: [...ALLOWED_STATUSES] },
          technician_id: { type: 'string' },
          customer_id: { type: 'string' },
          start_date: { type: 'string', description: 'ISO date or datetime' },
          end_date: { type: 'string', description: 'ISO date or datetime' },
          limit: { type: 'integer', minimum: 1, maximum: 25 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_technicians',
      description: 'List technicians for the business.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Filter by name' },
          limit: { type: 'integer', minimum: 1, maximum: 25 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_customers',
      description: 'List customers for the business.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Filter by name' },
          limit: { type: 'integer', minimum: 1, maximum: 25 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_job',
      description: 'Create a new job.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          technician_id: { type: 'string' },
          scheduled_start: { type: 'string', description: 'ISO datetime' },
          scheduled_end: { type: 'string', description: 'ISO datetime' },
          description: { type: 'string' },
          urgency: { type: 'string' },
        },
        required: ['customer_id', 'scheduled_start'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_job_status',
      description: 'Update a job status and optionally reschedule or assign a technician.',
      parameters: {
        type: 'object',
        properties: {
          job_id: { type: 'string' },
          status: { type: 'string', enum: [...ALLOWED_STATUSES] },
          technician_id: { type: 'string' },
          scheduled_start: { type: 'string', description: 'ISO datetime' },
          scheduled_end: { type: 'string', description: 'ISO datetime' },
        },
        required: ['job_id', 'status'],
        additionalProperties: false,
      },
    },
  },
] as const

const parseDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const buildUtcRangeForLocalDay = (date: string, offsetMinutes: number) => {
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) {
    return null
  }
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + offsetMinutes * 60 * 1000
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000
  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString(),
  }
}

const runTool = async (toolName: string, args: any, context: { businessId: string; supabase: Awaited<ReturnType<typeof createClient>> }) => {
  const { businessId, supabase } = context

  if (toolName === 'list_jobs_for_day') {
    const limit = Math.min(Number(args?.limit) || DEFAULT_LIMIT, 25)
    const offsetMinutes = Number.isFinite(Number(args?.timezone_offset_minutes))
      ? Number(args?.timezone_offset_minutes)
      : 0
    const range = buildUtcRangeForLocalDay(args?.date, offsetMinutes)
    if (!range) {
      return { error: 'Invalid date format' }
    }

    let query = supabase
      .from('jobs')
      .select('id, status, scheduled_start, scheduled_end, description, urgency, customer:customers(name), technician:users(full_name)')
      .eq('business_id', businessId)
      .gte('scheduled_start', range.start)
      .lt('scheduled_start', range.end)

    if (args?.status) query = query.eq('status', args.status)

    const { data, error } = await query.order('scheduled_start', { ascending: true }).limit(limit)
    if (error) return { error: error.message }

    const jobs = (data || []).map((job) => ({
      ...job,
      url: `/admin/jobs/${job.id}`,
    }))

    return { jobs, date: args?.date }
  }

  if (toolName === 'list_jobs') {
    const limit = Math.min(Number(args?.limit) || DEFAULT_LIMIT, 25)
    let query = supabase
      .from('jobs')
      .select('id, status, scheduled_start, scheduled_end, description, urgency, customer:customers(name), technician:users(full_name)')
      .eq('business_id', businessId)

    if (args?.status) query = query.eq('status', args.status)
    if (args?.technician_id) query = query.eq('technician_id', args.technician_id)
    if (args?.customer_id) query = query.eq('customer_id', args.customer_id)
    if (args?.start_date) query = query.gte('scheduled_start', args.start_date)
    if (args?.end_date) query = query.lte('scheduled_start', args.end_date)

    const { data, error } = await query.order('scheduled_start', { ascending: true }).limit(limit)
    if (error) return { error: error.message }
    const jobs = (data || []).map((job) => ({
      ...job,
      url: `/admin/jobs/${job.id}`,
    }))
    return { jobs }
  }

  if (toolName === 'list_technicians') {
    const limit = Math.min(Number(args?.limit) || DEFAULT_LIMIT, 25)
    let query = supabase
      .from('users')
      .select('id, full_name, email')
      .eq('business_id', businessId)
      .eq('role', 'tech')

    if (args?.query) query = query.ilike('full_name', `%${args.query}%`)

    const { data, error } = await query.order('full_name', { ascending: true }).limit(limit)
    if (error) return { error: error.message }
    return { technicians: data || [] }
  }

  if (toolName === 'list_customers') {
    const limit = Math.min(Number(args?.limit) || DEFAULT_LIMIT, 25)
    let query = supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', businessId)

    if (args?.query) query = query.ilike('name', `%${args.query}%`)

    const { data, error } = await query.order('name', { ascending: true }).limit(limit)
    if (error) return { error: error.message }
    return { customers: data || [] }
  }

  if (toolName === 'create_job') {
    const scheduledStart = parseDate(args?.scheduled_start)
    const scheduledEnd = parseDate(args?.scheduled_end)

    if (!scheduledStart) {
      return { error: 'Invalid scheduled_start' }
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', args.customer_id)
      .eq('business_id', businessId)
      .single()

    if (!customer) {
      return { error: 'Customer not found' }
    }

    if (args?.technician_id) {
      const { data: tech } = await supabase
        .from('users')
        .select('id')
        .eq('id', args.technician_id)
        .eq('business_id', businessId)
        .single()
      if (!tech) {
        return { error: 'Technician not found' }
      }
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        business_id: businessId,
        source: 'manual',
        customer_id: args.customer_id,
        technician_id: args?.technician_id || null,
        status: 'scheduled',
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        description: args?.description || null,
        urgency: args?.urgency || null,
      })
      .select('id, status, scheduled_start, scheduled_end, description, technician_id, customer_id')
      .single()

    if (error || !job) {
      return { error: error?.message || 'Failed to create job' }
    }

    try {
      await sendJobStatusSMS({
        jobId: job.id,
        customerId: job.customer_id,
        status: job.status,
        scheduledStart: job.scheduled_start,
        description: job.description,
        technicianId: job.technician_id,
        total: null,
      })
    } catch (smsError) {
      console.error('SMS notification error:', smsError)
    }

    if (job.technician_id) {
      try {
        await sendTechnicianAssignedSMS(job.id, job.customer_id, job.technician_id)
      } catch (smsError) {
        console.error('Technician assigned SMS error:', smsError)
      }
    }

    return { job: { ...job, url: `/admin/jobs/${job.id}` } }
  }

  if (toolName === 'update_job_status') {
    if (!ALLOWED_STATUSES.includes(args?.status)) {
      return { error: 'Invalid status' }
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, technician_id, customer_id, description')
      .eq('id', args.job_id)
      .eq('business_id', businessId)
      .single()

    if (jobError || !job) {
      return { error: 'Job not found' }
    }

    const scheduledStart = parseDate(args?.scheduled_start)
    const scheduledEnd = parseDate(args?.scheduled_end)

    if (args?.scheduled_start && !scheduledStart) {
      return { error: 'Invalid scheduled_start' }
    }
    if (args?.scheduled_end && !scheduledEnd) {
      return { error: 'Invalid scheduled_end' }
    }

    const updatePayload: Record<string, any> = { status: args.status }

    if (typeof args?.technician_id !== 'undefined') {
      updatePayload.technician_id = args.technician_id || null
    }
    if (scheduledStart) updatePayload.scheduled_start = scheduledStart
    if (scheduledEnd) updatePayload.scheduled_end = scheduledEnd

    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', args.job_id)
      .select('id, status, scheduled_start, scheduled_end, description, technician_id, customer_id')
      .single()

    if (updateError || !updatedJob) {
      return { error: updateError?.message || 'Failed to update job' }
    }

    if (job.status !== updatedJob.status && updatedJob.technician_id) {
      let customerName: string | null = null

      try {
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('name')
          .eq('id', job.customer_id)
          .single()
        customerName = customer?.name || null
      } catch (error) {
        console.error('Customer lookup error:', error)
      }

      const title = 'Job Status Updated'
      const statusLabel = updatedJob.status.replace(/_/g, ' ')
      const messageParts = [
        `Status changed to ${statusLabel}.`,
        customerName ? `Customer: ${customerName}.` : null,
        job.description ? `Job: ${job.description}.` : null,
      ].filter(Boolean)

      try {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: updatedJob.technician_id,
            type: 'job_status_changed',
            title,
            message: messageParts.join(' '),
            link: `/tech/jobs/${updatedJob.id}`,
          })
      } catch (notificationError) {
        console.error('Notification insert error:', notificationError)
      }
    }

    if (job.status !== updatedJob.status && updatedJob.customer_id) {
      try {
        await sendJobStatusSMS({
          jobId: updatedJob.id,
          customerId: updatedJob.customer_id,
          status: updatedJob.status,
          scheduledStart: updatedJob.scheduled_start,
          description: updatedJob.description,
          technicianId: updatedJob.technician_id,
          total: null,
        })
      } catch (smsError) {
        console.error('SMS notification error:', smsError)
      }
    }

    if (
      typeof args?.technician_id !== 'undefined' &&
      args?.technician_id &&
      args?.technician_id !== job.technician_id &&
      updatedJob.customer_id
    ) {
      try {
        await sendTechnicianAssignedSMS(updatedJob.id, updatedJob.customer_id, args.technician_id)
      } catch (smsError) {
        console.error('Technician assigned SMS error:', smsError)
      }
    }

    return { job: { ...updatedJob, url: `/admin/jobs/${updatedJob.id}` } }
  }

  return { error: 'Unknown tool' }
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is missing' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('full_name, role, business_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', profile.business_id)
      .single()

    const body = await request.json()
    const timeContext = {
      localDate: typeof body?.localDate === 'string' ? body.localDate : null,
      timezoneOffsetMinutes:
        typeof body?.timezoneOffsetMinutes === 'number' ? body.timezoneOffsetMinutes : null,
    }
    const messages = normalizeMessages(body?.messages)

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const baseMessages = [
      {
        role: 'system',
        content: buildSystemPrompt(business?.name ?? null, profile.full_name ?? null, timeContext),
      },
      ...messages.slice(-MAX_MESSAGES),
    ] as OpenAI.ChatCompletionMessageParam[]

    let reply: string | null = null
    let loop = 0
    let nextMessages = [...baseMessages]

    while (loop < MAX_TOOL_LOOPS) {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        temperature: 0.3,
        max_completion_tokens: 450,
        messages: nextMessages,
        tools: tools as any,
      })

      const assistantMessage = response.choices[0]?.message
      if (!assistantMessage) {
        break
      }

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        nextMessages = [...nextMessages, assistantMessage]
        for (const toolCall of assistantMessage.tool_calls) {
          let args = {}
          try {
            args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {}
          } catch (error) {
            args = {}
          }

          const result = await runTool(toolCall.function.name, args, {
            businessId: profile.business_id,
            supabase,
          })

          nextMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          })
        }
        loop += 1
        continue
      }

      reply = assistantMessage.content?.trim() || null
      break
    }

    if (!reply) {
      return NextResponse.json({ error: 'No response from assistant' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
