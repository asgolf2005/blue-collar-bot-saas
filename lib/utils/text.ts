export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function toSentenceCase(value: string): string {
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return ''

  const firstAlphaIndex = trimmed.search(/[A-Za-z]/)
  if (firstAlphaIndex < 0) return trimmed

  const first = trimmed[firstAlphaIndex]
  return (
    trimmed.slice(0, firstAlphaIndex) +
    first.toUpperCase() +
    trimmed.slice(firstAlphaIndex + 1)
  )
}

export function ensureTerminalPunctuation(value: string): string {
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return ''
  if (/[.!?]$/.test(trimmed)) return trimmed
  return `${trimmed}.`
}

function shouldKeepUppercase(word: string): boolean {
  return /^[A-Z0-9]{2,6}$/.test(word)
}

export function toTitleCase(value: string): string {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return ''

  return normalized
    .split(' ')
    .map((word) => {
      if (shouldKeepUppercase(word)) return word

      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function toReadableSentence(value: string): string {
  return ensureTerminalPunctuation(toSentenceCase(value))
}
