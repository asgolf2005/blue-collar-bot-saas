export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10_000,
  errorMessage = 'AI request timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}

export function parseJsonFromModel<T>(value: string | null | undefined): T | null {
  if (!value) return null

  const trimmed = value.trim()
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = codeBlockMatch?.[1]?.trim() || trimmed

  try {
    return JSON.parse(candidate) as T
  } catch {
    // Try to recover by extracting the first JSON object block.
  }

  const objectMatch = candidate.match(/\{[\s\S]*\}/)
  if (!objectMatch) return null

  try {
    return JSON.parse(objectMatch[0]) as T
  } catch {
    return null
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:${file.type || 'application/octet-stream'};base64,${base64}`
}

export function compactLines(lines: Array<string | null | undefined | false>): string {
  return lines.filter(Boolean).join('\n')
}
