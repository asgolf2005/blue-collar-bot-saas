/**
 * OpenAI Client Configuration for Blue Collar Bot AI Features
 * 
 * Features:
 * - GPT-4o-mini: Cost-effective for text tasks (voice notes, summaries)
 * - GPT-4o: Higher quality for complex reasoning
 * - GPT-4 Vision: Image analysis (parts identification, completion verification)
 * - Whisper: Audio transcription (voice-to-notes)
 * 
 * Setup:
 * Add OPENAI_API_KEY to .env.local
 * 
 * Cost Optimization:
 * - Use GPT-4o-mini for structured text tasks
 * - Use GPT-4 Vision only when images are involved
 * - Cache results where appropriate
 */

import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set - AI features will be disabled')
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export const isOpenAIConfigured = Boolean(process.env.OPENAI_API_KEY)

// Model selection helpers
export const Models = {
  // Fast, cheap, good for structured tasks
  FAST: 'gpt-4o-mini',
  
  // Higher quality for complex reasoning
  SMART: 'gpt-4o',
  
  // Vision capabilities for image analysis
  VISION: 'gpt-4o',
  
  // Audio transcription
  WHISPER: 'whisper-1',
} as const

// Cost tracking (optional - for monitoring)
export interface UsageMetrics {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
}

export function calculateCost(metrics: UsageMetrics, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.15, output: 0.6 }, // per 1M tokens
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4-turbo': { input: 10, output: 30 },
  }
  
  const rate = pricing[model] || pricing['gpt-4o-mini']
  const inputCost = (metrics.promptTokens / 1_000_000) * rate.input
  const outputCost = (metrics.completionTokens / 1_000_000) * rate.output
  
  return inputCost + outputCost
}

// Error handling wrapper
export async function callOpenAIWithFallback<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error('OpenAI API error:', error)
    return fallback
  }
}
