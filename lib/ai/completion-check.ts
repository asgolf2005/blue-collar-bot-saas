import type { SupabaseClient } from '@supabase/supabase-js'
import { Models, isOpenAIConfigured, openai } from '@/lib/ai/openai'
import { parseJsonFromModel, withTimeout } from '@/lib/ai/utils'
import {
  COMPLETION_REQUIREMENTS,
  formatCompletionRequirementsForPrompt,
} from '@/lib/ai/completion-requirements'
import { toReadableSentence } from '@/lib/utils/text'

type PhotoStage = 'before' | 'after'

interface MediaRow {
  id: string
  file_url: string
  file_type: string | null
  created_at: string
}

interface NoteRow {
  content: string
  created_at: string
}

interface VerificationAIResult {
  id: string
  passed: boolean
  confidence?: number
  reason?: string
}

interface VerificationAIResponse {
  overall_status?: 'pass' | 'warning' | 'block'
  summary?: string
  warnings?: string[]
  results?: VerificationAIResult[]
}

export interface CompletionRequirementResult {
  id: string
  label: string
  description: string
  hardFail: boolean
  passed: boolean
  confidence: number
  reason: string
}

export interface CompletionVerificationResult {
  status: 'pass' | 'warning' | 'block'
  summary: string
  warnings: string[]
  missingPhotoTypes: PhotoStage[]
  photoCounts: {
    before: number
    during: number
    after: number
  }
  requirements: CompletionRequirementResult[]
}

const clampConfidence = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

const parseErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return String(error || 'Unknown error')
}

const toFailureSummary = (error: unknown) => {
  const message = parseErrorMessage(error).toLowerCase()

  if (message.includes('timed out')) {
    return {
      summary: 'Completion verification timed out. Manual review is required.',
      warning: 'AI request timed out before completion.',
    }
  }

  if (message.includes('401') || message.includes('invalid api key') || message.includes('incorrect api key')) {
    return {
      summary: 'Completion verification failed due to API authentication error.',
      warning: 'OpenAI API key is invalid or unauthorized.',
    }
  }

  if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
    return {
      summary: 'Completion verification is temporarily rate-limited.',
      warning: 'OpenAI rate limit or quota exceeded.',
    }
  }

  return {
    summary: 'Completion verification could not complete. Manual review is required.',
    warning: toReadableSentence(`AI verification failed: ${parseErrorMessage(error)}`),
  }
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await withTimeout(fetch(url), 4_000, 'Image fetch timed out')
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null

    const arrayBuffer = await response.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) return null

    const maxBytes = 5 * 1024 * 1024
    if (arrayBuffer.byteLength > maxBytes) return null

    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

function buildMissingPhotosResult(
  missingPhotoTypes: PhotoStage[],
  counts: CompletionVerificationResult['photoCounts']
): CompletionVerificationResult {
  return {
    status: 'block',
    summary:
      'Completion verification requires both before and after photos to confirm the problem was solved.',
    warnings: [],
    missingPhotoTypes,
    photoCounts: counts,
    requirements: COMPLETION_REQUIREMENTS.map((item) => ({
      ...item,
      passed: false,
      confidence: 100,
      reason: missingPhotoTypes.length
        ? `Missing required ${missingPhotoTypes.join(' and ')} photos.`
        : 'Not evaluated.',
    })),
  }
}

export async function evaluateCompletionVerification({
  supabase,
  jobId,
  onAIUsage,
}: {
  supabase: SupabaseClient
  jobId: string
  onAIUsage?: (model: string, tokens: number) => void
}): Promise<CompletionVerificationResult> {
  const [{ data: media, error: mediaError }, { data: notes }] = await Promise.all([
    supabase
      .from('media')
      .select('id, file_url, file_type, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true }),
    supabase
      .from('job_notes')
      .select('content, created_at')
      .eq('job_id', jobId)
      .eq('note_type', 'note')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  if (mediaError) {
    throw new Error(mediaError.message || 'Failed to load job photos for verification')
  }

  const rows = (media || []) as MediaRow[]
  const latestNote = (notes?.[0] || null) as NoteRow | null

  const beforePhotos = rows.filter((row) => row.file_type === 'before')
  const afterPhotos = rows.filter((row) => row.file_type === 'after')
  const duringPhotos = rows.filter((row) => row.file_type === 'during' || !row.file_type)

  const counts = {
    before: beforePhotos.length,
    during: duringPhotos.length,
    after: afterPhotos.length,
  }

  const missingPhotoTypes: PhotoStage[] = []
  if (beforePhotos.length === 0) missingPhotoTypes.push('before')
  if (afterPhotos.length === 0) missingPhotoTypes.push('after')
  if (missingPhotoTypes.length > 0) {
    return buildMissingPhotosResult(missingPhotoTypes, counts)
  }

  if (!isOpenAIConfigured || !openai) {
    return {
      status: 'warning',
      summary:
        'AI completion verification is unavailable. Photos exist, but manual verification is required.',
      warnings: ['OPENAI_API_KEY is not configured.'],
      missingPhotoTypes: [],
      photoCounts: counts,
      requirements: COMPLETION_REQUIREMENTS.map((item) => ({
        ...item,
        passed: true,
        confidence: 20,
        reason: 'AI unavailable. Manual verification required.',
      })),
    }
  }

  const selectedBefore = beforePhotos.slice(-1)
  const selectedAfter = afterPhotos.slice(-1)
  const selectedDuring = duringPhotos.slice(-1)

  const selectedAll = [...selectedBefore, ...selectedDuring, ...selectedAfter]
  const selectedWithResolvedImages = await Promise.all(
    selectedAll.map(async (photo) => {
      const dataUrl = await imageUrlToDataUrl(photo.file_url)
      return {
        ...photo,
        modelUrl: dataUrl || photo.file_url,
      }
    })
  )

  const [resolvedBefore] = selectedWithResolvedImages
  const resolvedDuring = selectedWithResolvedImages[selectedBefore.length] || null
  const resolvedAfter = selectedWithResolvedImages[selectedAll.length - 1]

  const content = [
    {
      type: 'text' as const,
          text: [
            'Verify whether this job is genuinely complete: problem identified then problem solved.',
            'Return strict JSON only.',
            'Use professional grammar and sentence capitalization.',
            '',
            formatCompletionRequirementsForPrompt(),
        '',
        'JSON schema:',
        '{',
        '  "overall_status": "pass" | "warning" | "block",',
        '  "summary": "short summary",',
        '  "warnings": ["optional warning"],',
        '  "results": [',
        '    { "id": "requirement-id", "passed": true, "confidence": 0-100, "reason": "brief reason" }',
        '  ]',
        '}',
        '',
        latestNote
          ? `Latest note context:\n${latestNote.content.slice(0, 1200)}`
          : 'Latest note context: none',
      ].join('\n'),
    },
    {
      type: 'image_url' as const,
      image_url: {
        url: resolvedBefore.modelUrl,
        detail: 'low' as const,
      },
    },
    ...(resolvedDuring
      ? [
          {
            type: 'image_url' as const,
            image_url: {
              url: resolvedDuring.modelUrl,
              detail: 'low' as const,
            },
          },
        ]
      : []),
    {
      type: 'image_url' as const,
      image_url: {
        url: resolvedAfter.modelUrl,
        detail: 'low' as const,
      },
    },
  ]

  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: Models.VISION,
        temperature: 0.1,
        max_completion_tokens: 700,
        messages: [
          {
            role: 'system',
            content:
              'You are a strict job completion auditor. Require evidence that the original problem is solved before passing.',
          },
          {
            role: 'user',
            content,
          },
        ],
      }),
      12_000,
      'Completion verification timed out'
    )
    onAIUsage?.(Models.VISION, response.usage?.total_tokens || 0)

    const parsed = parseJsonFromModel<VerificationAIResponse>(response.choices[0]?.message?.content)
    if (!parsed?.results || !Array.isArray(parsed.results)) {
      return {
        status: 'warning',
        summary: 'AI verification returned an invalid response. Manual review is required.',
        warnings: ['AI output parsing failed.'],
        missingPhotoTypes: [],
        photoCounts: counts,
        requirements: COMPLETION_REQUIREMENTS.map((item) => ({
          ...item,
          passed: true,
          confidence: 20,
          reason: 'AI output invalid. Manual verification required.',
        })),
      }
    }

    const aiMap = new Map(parsed.results.map((item) => [item.id, item]))
    const requirements: CompletionRequirementResult[] = COMPLETION_REQUIREMENTS.map((item) => {
      const aiResult = aiMap.get(item.id)
      if (!aiResult) {
        return {
          ...item,
          passed: false,
          confidence: 0,
          reason: 'AI did not evaluate this requirement.',
        }
      }

      return {
        ...item,
        passed: Boolean(aiResult.passed),
        confidence: clampConfidence(aiResult.confidence),
        reason: toReadableSentence(
          aiResult.reason?.trim() ||
            (aiResult.passed ? 'Requirement appears satisfied.' : 'Requirement not satisfied.')
        ),
      }
    })

    const hardFailViolation = requirements.some((item) => item.hardFail && !item.passed)
    const anyFailed = requirements.some((item) => !item.passed)
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter(Boolean).map((warning) => toReadableSentence(warning))
      : []

    let status: CompletionVerificationResult['status'] = 'pass'
    if (hardFailViolation || parsed.overall_status === 'block') {
      status = 'block'
    } else if (anyFailed || parsed.overall_status === 'warning' || warnings.length > 0) {
      status = 'warning'
    }

    return {
      status,
      summary: toReadableSentence(
        parsed.summary?.trim() ||
          (status === 'pass'
            ? 'Completion verification passed. Problem appears solved.'
            : status === 'block'
            ? 'Completion verification failed. Problem not clearly resolved.'
            : 'Completion verification found concerns. Review before completion.')
      ),
      warnings,
      missingPhotoTypes: [],
      photoCounts: counts,
      requirements,
    }
  } catch (error) {
    console.error('Completion verification failed:', error)
    const failure = toFailureSummary(error)
    return {
      status: 'warning',
      summary: failure.summary,
      warnings: [failure.warning],
      missingPhotoTypes: [],
      photoCounts: counts,
      requirements: COMPLETION_REQUIREMENTS.map((item) => ({
        ...item,
        passed: true,
        confidence: 20,
        reason: 'AI request failed. Manual verification required.',
      })),
    }
  }
}
