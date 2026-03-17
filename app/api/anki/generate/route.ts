import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic, count = 5, context } = await req.json()
  if (!topic?.trim()) return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

  const clampedCount = Math.min(Math.max(1, count), 20)

  const prompt = `Generate ${clampedCount} high-quality Anki flashcards about: "${topic}"${context ? `\n\nAdditional context:\n${context}` : ''}

Return ONLY a JSON array. Each item must have "front" and "back" keys.
- Front: a clear, specific question or prompt
- Back: a concise, accurate answer (1-3 sentences max)
- Vary the question types (definition, example, application, comparison)
- Do not number the cards

Example format:
[{"front": "What is X?", "back": "X is ..."}]`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  let cards: { front: string; back: string }[]
  try {
    const parsed = JSON.parse(raw)
    // Handle both {cards: [...]} and [...] responses
    cards = Array.isArray(parsed) ? parsed : (parsed.cards ?? Object.values(parsed)[0] ?? [])
    if (!Array.isArray(cards)) throw new Error('Not an array')
    cards = cards
      .filter((c: any) => c.front && c.back)
      .map((c: any) => ({ front: String(c.front).trim(), back: String(c.back).trim() }))
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  return NextResponse.json({ cards })
}
