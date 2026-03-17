'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewDeckPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/anki/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create deck')
      setSaving(false)
      return
    }
    const deck = await res.json()
    router.push(`/anki/decks/${deck.id}`)
  }

  return (
    <div>
      <h1>New Deck</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Japanese Vocab" />
        </div>
        <div>
          <label>Description (optional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this deck for?" />
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create Deck'}
        </button>
      </form>
    </div>
  )
}
