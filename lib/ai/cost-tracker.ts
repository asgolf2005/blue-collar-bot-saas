const dailyCosts = new Map<string, number>()

export function trackAICost(userId: string, model: string, tokens: number) {
  const pricing: Record<string, number> = {
    'gpt-4o-mini': 0.00015,
    'gpt-4o': 0.0025,
    'gpt-4o-vision': 0.0025,
    'whisper-1': 0.006,
  }

  const cost = (tokens / 1000) * (pricing[model] || 0.00015)
  const current = dailyCosts.get(userId) || 0
  dailyCosts.set(userId, current + cost)

  if (current + cost > 5) {
    console.warn(`AI cost alert: User ${userId} exceeded $5 daily`)
  }
}
