type ServiceStatusStore = {
  n8nLastReceivedAt: string | null
}

declare global {
  var __bcbServiceStatus: ServiceStatusStore | undefined
}

function getStore(): ServiceStatusStore {
  if (!globalThis.__bcbServiceStatus) {
    globalThis.__bcbServiceStatus = {
      n8nLastReceivedAt: null,
    }
  }
  return globalThis.__bcbServiceStatus
}

export function markN8nWebhookReceived(timestamp = new Date()): void {
  const store = getStore()
  store.n8nLastReceivedAt = timestamp.toISOString()
}

export function getN8nLastReceivedAt(): string | null {
  return getStore().n8nLastReceivedAt
}
