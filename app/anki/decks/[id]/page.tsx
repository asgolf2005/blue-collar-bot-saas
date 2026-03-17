'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/lib/anki/types'

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [deck, setDeck] = useState<any>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/anki/decks/${id}`)
      .then(r => r.json())
      .then(data => {
        setDeck(data)
        setCards(data.cards ?? [])
        setLoading(false)
      })
  }, [id])

  async function deleteCard(cardId: string) {
    setDeleting(cardId)
    await fetch(`/api/anki/cards/${cardId}`, { method: 'DELETE' })
    setCards(prev => prev.filter(c => c.id !== cardId))
    setDeleting(null)
  }

  async function deleteDeck() {
    if (!confirm('Delete this deck and all its cards?')) return
    await fetch(`/api/anki/decks/${id}`, { method: 'DELETE' })
    router.push('/anki')
  }

  if (loading) return <div>Loading...</div>
  if (!deck) return <div>Deck not found</div>

  const today = new Date().toISOString().split('T')[0]
  const dueCount = cards.filter(c => {
    const r = (c as any).card_reviews?.[0]
    return !r || r.due_date <= today
  }).length

  return (
    <div>
      <div>
        <Link href="/anki">← Back</Link>
        <h1>{deck.name}</h1>
        {deck.description && <p>{deck.description}</p>}
        <div>
          <span>{cards.length} cards</span>
          <span>{dueCount} due today</span>
        </div>
      </div>

      <div>
        <Link href={`/anki/decks/${id}/cards/new`}>Add Card</Link>
        {dueCount > 0 && <Link href={`/anki/decks/${id}/study`}>Study Now ({dueCount})</Link>}
        <button onClick={deleteDeck}>Delete Deck</button>
      </div>

      {cards.length === 0 && (
        <p>No cards yet. <Link href={`/anki/decks/${id}/cards/new`}>Add your first card</Link></p>
      )}

      <ul>
        {cards.map(card => {
          const review = (card as any).card_reviews?.[0]
          const due = !review || review.due_date <= today
          return (
            <li key={card.id}>
              <div>
                <p>{card.front}</p>
                <p>{card.back}</p>
              </div>
              <div>
                <span>{review?.state ?? 'new'}</span>
                {due && <span>Due</span>}
                {review?.interval > 0 && <span>Interval: {review.interval}d</span>}
              </div>
              <button onClick={() => deleteCard(card.id)} disabled={deleting === card.id}>
                {deleting === card.id ? '...' : 'Delete'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
