import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDefaultSchedule } from '@/lib/anki/sm2'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deck_id, front, back, front_media_url, back_media_url } = await req.json()
  if (!deck_id || !front?.trim() || !back?.trim())
    return NextResponse.json({ error: 'deck_id, front and back are required' }, { status: 400 })

  // Verify deck belongs to user
  const { error: deckError } = await supabase
    .from('decks').select('id').eq('id', deck_id).eq('user_id', user.id).single()
  if (deckError) return NextResponse.json({ error: 'Deck not found' }, { status: 404 })

  const { data: card, error } = await supabase
    .from('cards')
    .insert({
      deck_id,
      user_id: user.id,
      front: front.trim(),
      back: back.trim(),
      front_media_url: front_media_url || null,
      back_media_url: back_media_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create initial review record
  await supabase.from('card_reviews').insert({
    card_id: card.id,
    user_id: user.id,
    ...getDefaultSchedule(),
  })

  return NextResponse.json(card, { status: 201 })
}
