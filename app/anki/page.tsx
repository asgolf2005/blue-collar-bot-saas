'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Deck } from '@/lib/anki/types'

export default function AnkiPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/anki/decks')
      .then(r => r.json())
      .then(data => { setDecks(data); setLoading(false) })
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div>
        <h1>My Decks</h1>
        <Link href="/anki/decks/new">New Deck</Link>
      </div>

      {decks.length === 0 && <p>No decks yet. Create your first deck to get started.</p>}

      <ul>
        {decks.map(deck => (
          <li key={deck.id}>
            <Link href={`/anki/decks/${deck.id}`}>
              <div>
                <span>{deck.name}</span>
                {deck.description && <span>{deck.description}</span>}
              </div>
              <div>
                <span>{deck.due_count} due</span>
                <span>{deck.total_cards} cards</span>
              </div>
            </Link>
            {(deck.due_count ?? 0) > 0 && (
              <Link href={`/anki/decks/${deck.id}/study`}>Study</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
