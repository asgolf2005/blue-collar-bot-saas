import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // Get all cards for this deck with their review state, ordered by priority
  const { data: cards, error } = await supabase
    .from('cards')
    .select(`*, card_reviews(*)`)
    .eq('deck_id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const due = cards
    .map((c: any) => ({ ...c, review: c.card_reviews?.[0] ?? null }))
    .filter((c: any) => !c.review || c.review.due_date <= today)
    .sort((a: any, b: any) => {
      // Priority: learning/relearning > review > new
      const priority = (state: string | undefined) => {
        if (!state || state === 'new') return 3
        if (state === 'learning' || state === 'relearning') return 1
        return 2
      }
      const pa = priority(a.review?.state)
      const pb = priority(b.review?.state)
      if (pa !== pb) return pa - pb
      // Within same priority, sort by due_date ascending
      return (a.review?.due_date ?? '').localeCompare(b.review?.due_date ?? '')
    })
    .map(({ card_reviews: _, ...c }: any) => c)

  return NextResponse.json({ cards: due, total: due.length })
}
