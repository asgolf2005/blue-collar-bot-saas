import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const { data: decks, error } = await supabase
    .from('decks')
    .select(`
      *,
      cards(
        id,
        card_reviews(state, due_date)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const decksWithCounts = decks.map((deck: any) => {
    const cards = deck.cards ?? []
    const total_cards = cards.length
    const due_count = cards.filter((c: any) => {
      const review = c.card_reviews?.[0]
      if (!review) return true // new card, always due
      return review.due_date <= today
    }).length
    const { cards: _, ...rest } = deck
    return { ...rest, total_cards, due_count }
  })

  return NextResponse.json(decksWithCounts)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('decks')
    .insert({ user_id: user.id, name: name.trim(), description: description?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
