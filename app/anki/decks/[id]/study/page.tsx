'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { StudyCard } from '@/lib/anki/types'

type Rating = 1 | 2 | 3 | 4

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [queue, setQueue] = useState<StudyCard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  useEffect(() => {
    fetch(`/api/anki/decks/${id}/study`)
      .then(r => r.json())
      .then(data => { setQueue(data.cards ?? []); setLoading(false) })
  }, [id])

  const rate = useCallback(async (rating: Rating) => {
    const card = queue[current]
    if (!card) return

    await fetch(`/api/anki/cards/${card.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    })

    setReviewed(r => r + 1)
    setFlipped(false)

    if (current + 1 >= queue.length) {
      setDone(true)
    } else {
      setCurrent(c => c + 1)
    }
  }, [queue, current])

  // Keyboard shortcuts: Space to flip, 1/2/3/4 to rate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!flipped) setFlipped(true)
      }
      if (flipped) {
        if (e.key === '1') rate(1)
        if (e.key === '2') rate(2)
        if (e.key === '3') rate(3)
        if (e.key === '4') rate(4)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, rate])

  if (loading) return <div>Loading cards...</div>

  if (queue.length === 0) {
    return (
      <div>
        <h1>Nothing to study!</h1>
        <p>No cards are due for this deck right now.</p>
        <Link href={`/anki/decks/${id}`}>Back to Deck</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div>
        <h1>Session complete!</h1>
        <p>You reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}.</p>
        <Link href={`/anki/decks/${id}`}>Back to Deck</Link>
        <Link href="/anki">All Decks</Link>
      </div>
    )
  }

  const card = queue[current]
  const progress = `${current + 1} / ${queue.length}`

  return (
    <div>
      <div>
        <Link href={`/anki/decks/${id}`}>✕ Exit</Link>
        <span>{progress}</span>
        <span>{card.review?.state ?? 'new'}</span>
      </div>

      {/* Card */}
      <div onClick={() => !flipped && setFlipped(true)} style={{ cursor: flipped ? 'default' : 'pointer' }}>
        {/* Front */}
        <div>
          <p>{card.front}</p>
          {card.front_media_url && (
            card.front_media_url.match(/\.(mp3|wav|ogg)$/i)
              ? <audio controls src={card.front_media_url} />
              : <img src={card.front_media_url} alt="front media" />
          )}
        </div>

        {/* Back — only shown when flipped */}
        {flipped && (
          <div>
            <hr />
            <p>{card.back}</p>
            {card.back_media_url && (
              card.back_media_url.match(/\.(mp3|wav|ogg)$/i)
                ? <audio controls src={card.back_media_url} />
                : <img src={card.back_media_url} alt="back media" />
            )}
          </div>
        )}

        {!flipped && <p>Click or press Space to reveal</p>}
      </div>

      {/* Rating buttons — only shown when flipped */}
      {flipped && (
        <div>
          <button onClick={() => rate(1)} title="Shortcut: 1">Again</button>
          <button onClick={() => rate(2)} title="Shortcut: 2">Hard</button>
          <button onClick={() => rate(3)} title="Shortcut: 3">Good</button>
          <button onClick={() => rate(4)} title="Shortcut: 4">Easy</button>
        </div>
      )}

      <p>Keyboard: Space to flip · 1 Again · 2 Hard · 3 Good · 4 Easy</p>
    </div>
  )
}
