import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scheduleCard, type Rating, type CardSchedule } from '@/lib/anki/sm2'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rating } = await req.json()
  if (![1, 2, 3, 4].includes(rating))
    return NextResponse.json({ error: 'Rating must be 1, 2, 3, or 4' }, { status: 400 })

  const { data: review, error: fetchError } = await supabase
    .from('card_reviews')
    .select('*')
    .eq('card_id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError) return NextResponse.json({ error: 'Review record not found' }, { status: 404 })

  const next = scheduleCard(review as CardSchedule, rating as Rating)

  const { data: updated, error } = await supabase
    .from('card_reviews')
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq('card_id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
