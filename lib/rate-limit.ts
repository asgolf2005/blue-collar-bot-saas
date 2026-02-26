type RateLimitRecord = {
  count: number
  resetAt: number
}

type RateLimitAllowed = { allowed: true }
type RateLimitBlocked = { allowed: false; retryAfter: number }

const rateLimits = new Map<string, RateLimitRecord>()
const cooldowns = new Map<string, number>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitAllowed | RateLimitBlocked {
  const now = Date.now()
  const record = rateLimits.get(identifier)

  if (!record || now >= record.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    }
  }

  record.count += 1
  return { allowed: true }
}

export function checkCooldown(
  identifier: string,
  cooldownMs: number
): RateLimitAllowed | RateLimitBlocked {
  const now = Date.now()
  const cooldownUntil = cooldowns.get(identifier) || 0

  if (now < cooldownUntil) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((cooldownUntil - now) / 1000)),
    }
  }

  cooldowns.set(identifier, now + cooldownMs)
  return { allowed: true }
}
