'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // Manual card state
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [frontMediaUrl, setFrontMediaUrl] = useState('')
  const [backMediaUrl, setBackMediaUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // AI generation state
  const [aiTab, setAiTab] = useState(false)
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [count, setCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<{ front: string; back: string }[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

  // Media upload
  async function uploadMedia(file: File, side: 'front' | 'back') {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/anki/media', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      if (side === 'front') setFrontMediaUrl(data.url)
      else setBackMediaUrl(data.url)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/anki/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck_id: id, front, back, front_media_url: frontMediaUrl || null, back_media_url: backMediaUrl || null }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save card')
      setSaving(false)
      return
    }
    // Reset for next card
    setFront(''); setBack(''); setFrontMediaUrl(''); setBackMediaUrl('')
    setSaving(false)
    alert('Card saved! Add another or go back.')
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setGenerated([])
    setSelected(new Set())
    const res = await fetch('/api/anki/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, context, count }),
    })
    const data = await res.json()
    if (res.ok) {
      setGenerated(data.cards)
      setSelected(new Set(data.cards.map((_: any, i: number) => i)))
    }
    setGenerating(false)
  }

  async function handleBulkSave() {
    setBulkSaving(true)
    const toSave = generated.filter((_, i) => selected.has(i))
    for (const card of toSave) {
      await fetch('/api/anki/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: id, ...card }),
      })
    }
    setBulkSaving(false)
    router.push(`/anki/decks/${id}`)
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div>
      <Link href={`/anki/decks/${id}`}>← Back to Deck</Link>
      <h1>Add Cards</h1>

      <div>
        <button onClick={() => setAiTab(false)} aria-pressed={!aiTab}>Manual</button>
        <button onClick={() => setAiTab(true)} aria-pressed={aiTab}>Generate with AI</button>
      </div>

      {!aiTab ? (
        <form onSubmit={handleSave}>
          <div>
            <label>Front</label>
            <textarea value={front} onChange={e => setFront(e.target.value)} required rows={3} />
            <input type="file" accept="image/*,audio/*" onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'front')} />
            {frontMediaUrl && <img src={frontMediaUrl} alt="front media" style={{ maxWidth: 200 }} />}
          </div>
          <div>
            <label>Back</label>
            <textarea value={back} onChange={e => setBack(e.target.value)} required rows={3} />
            <input type="file" accept="image/*,audio/*" onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'back')} />
            {backMediaUrl && <img src={backMediaUrl} alt="back media" style={{ maxWidth: 200 }} />}
          </div>
          {error && <p>{error}</p>}
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Card'}</button>
        </form>
      ) : (
        <div>
          <form onSubmit={handleGenerate}>
            <div>
              <label>Topic</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g. JavaScript promises" />
            </div>
            <div>
              <label>Context (optional — paste notes, text, etc.)</label>
              <textarea value={context} onChange={e => setContext(e.target.value)} rows={4} />
            </div>
            <div>
              <label>Number of cards (1–20)</label>
              <input type="number" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))} />
            </div>
            <button type="submit" disabled={generating}>{generating ? 'Generating...' : 'Generate Cards'}</button>
          </form>

          {generated.length > 0 && (
            <div>
              <div>
                <p>{selected.size} of {generated.length} selected</p>
                <button onClick={() => setSelected(new Set(generated.map((_, i) => i)))}>Select all</button>
                <button onClick={() => setSelected(new Set())}>Deselect all</button>
              </div>
              <ul>
                {generated.map((card, i) => (
                  <li key={i} onClick={() => toggleSelect(i)} style={{ cursor: 'pointer', opacity: selected.has(i) ? 1 : 0.4 }}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} />
                    <p><strong>Q:</strong> {card.front}</p>
                    <p><strong>A:</strong> {card.back}</p>
                  </li>
                ))}
              </ul>
              <button onClick={handleBulkSave} disabled={bulkSaving || selected.size === 0}>
                {bulkSaving ? 'Saving...' : `Save ${selected.size} card${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
