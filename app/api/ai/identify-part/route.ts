import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fileToDataUrl, parseJsonFromModel, withTimeout } from '@/lib/ai/utils'
import { Models, openai, isOpenAIConfigured } from '@/lib/ai/openai'
import { toReadableSentence, toTitleCase, normalizeWhitespace } from '@/lib/utils/text'
import { checkCooldown, checkRateLimit } from '@/lib/rate-limit'
import { trackAICost } from '@/lib/ai/cost-tracker'

interface PartAnalysisResponse {
  part_name?: string
  likely_issue?: string
  replacement_needed?: boolean
  confidence?: number
  key_observations?: string[]
  search_terms?: string[]
}

interface ServiceRow {
  id: string
  name: string
  description: string | null
  base_price: number | null
}

const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024
const AI_IDENTIFY_PART_COOLDOWN_MS = 10_000

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toObservation = (value: string) => toReadableSentence(value)

function scoreService(service: ServiceRow, partName: string, searchTerms: string[]) {
  const haystack = normalizeText([service.name, service.description || ''].join(' '))
  let score = 0

  if (!haystack) return score
  if (partName && haystack.includes(partName)) score += 60

  for (const term of searchTerms) {
    if (!term) continue
    if (haystack.includes(term)) score += 20
  }

  return score
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

    const contentType = request.headers.get('content-type') || ''

    let jobId = ''
    let imageUrl = ''
    let imageDataUrl = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      jobId = String(formData.get('jobId') || '').trim()
      imageUrl = String(formData.get('imageUrl') || '').trim()
      const image = formData.get('image')

      if (image instanceof File) {
        if (image.size <= 0 || image.size > MAX_IMAGE_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'Image must be between 1 byte and 12 MB.' },
            { status: 400 }
          )
        }
        imageDataUrl = await fileToDataUrl(image)
      }
    } else {
      const body = (await request.json()) as { jobId?: string; imageUrl?: string }
      jobId = String(body.jobId || '').trim()
      imageUrl = String(body.imageUrl || '').trim()
    }

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    if (!imageUrl && !imageDataUrl) {
      return NextResponse.json({ error: 'Provide an image or imageUrl' }, { status: 400 })
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

    const rateLimit = checkRateLimit(`${user.id}:ai:identify-part`, 10, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const cooldown = checkCooldown(`${user.id}:ai:identify-part:${jobId}`, AI_IDENTIFY_PART_COOLDOWN_MS)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Please wait ${cooldown.retryAfter}s before running another part analysis for this job.` },
        {
          status: 429,
          headers: { 'Retry-After': String(cooldown.retryAfter) },
        }
      )
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, business_id, technician_id, description')
      .eq('id', jobId)
      .eq('business_id', profile.business_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (profile.role === 'tech' && job.technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!String(job.description || '').trim()) {
      return NextResponse.json(
        { error: 'Add a job description before using identify part.' },
        { status: 400 }
      )
    }

    if (!isOpenAIConfigured || !openai) {
      return NextResponse.json(
        { error: 'AI unavailable. Use manual part search.' },
        { status: 503 }
      )
    }

    const resolvedImageUrl = imageDataUrl || imageUrl
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: Models.VISION,
        temperature: 0.2,
        max_completion_tokens: 600,
        messages: [
          {
            role: 'system',
            content:
              'You are an HVAC/plumbing/electrical parts identification assistant. Respond with strict JSON only and never fabricate certainty.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'Identify the visible component and evaluate replacement need.',
                  'Return JSON only:',
                  '{',
                  '  "part_name": "string",',
                  '  "likely_issue": "string",',
                  '  "replacement_needed": true|false,',
                  '  "confidence": 0-100,',
                  '  "key_observations": ["string"],',
                  '  "search_terms": ["string"]',
                  '}',
                  '',
                  'If uncertain, lower confidence and explain.',
                  `Job context: ${job.description || 'General service call'}`,
                ].join('\n'),
              },
              {
                type: 'image_url',
                image_url: {
                  url: resolvedImageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
      10_000,
      'Part identification timed out'
    )
    trackAICost(user.id, 'gpt-4o-vision', completion.usage?.total_tokens || 0)

    const parsed = parseJsonFromModel<PartAnalysisResponse>(completion.choices[0]?.message?.content)
    if (!parsed) {
      return NextResponse.json(
        { error: 'AI returned an invalid response. Use manual part search.' },
        { status: 502 }
      )
    }

    const partName = normalizeText(parsed.part_name || '')
    const searchTerms = (parsed.search_terms || [])
      .map((term) => normalizeText(term))
      .filter(Boolean)
      .slice(0, 8)

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, description, base_price')
      .eq('business_id', profile.business_id)
      .eq('is_active', true)
      .limit(200)

    if (servicesError) {
      console.error('Service lookup failed:', servicesError)
    }

    const matchedServices = ((services || []) as ServiceRow[])
      .map((service) => ({
        ...service,
        matchScore: scoreService(service, partName, searchTerms),
      }))
      .filter((service) => service.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      analysis: {
        partName: toTitleCase(parsed.part_name?.trim() || 'Unknown component'),
        likelyIssue: toReadableSentence(parsed.likely_issue?.trim() || 'No issue details provided'),
        replacementNeeded: Boolean(parsed.replacement_needed),
        confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
        keyObservations: (parsed.key_observations || [])
          .map((item) => toObservation(item))
          .filter(Boolean)
          .slice(0, 6),
        searchTerms,
      },
      serviceMatches: matchedServices.map((service) => ({
        ...service,
        name: normalizeWhitespace(service.name),
        description: service.description ? toReadableSentence(service.description) : null,
      })),
    })
  } catch (error) {
    console.error('Identify part AI error:', error)
    return NextResponse.json(
      { error: 'Part identification failed. Continue with manual search.' },
      { status: 500 }
    )
  }
}
