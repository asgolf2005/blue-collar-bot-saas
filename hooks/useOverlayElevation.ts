import { useEffect } from 'react'
import type { RefObject } from 'react'

const OVERLAY_CONTAINER_SELECTOR =
  '.glass-card, .glass-card-interactive, .glass-card-neon, .glass-card-profit, ' +
  '.glass-card-danger, .glass-card-elevated, .glass-card-subtle, .glass-card-ultra, .card'

export function useOverlayElevation(isOpen: boolean, anchorRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen) return

    const anchor = anchorRef.current
    if (!anchor) return

    const container = anchor.closest(OVERLAY_CONTAINER_SELECTOR) as HTMLElement | null
    const target = container ?? anchor
    target.setAttribute('data-overlay-open', 'true')

    return () => {
      target.removeAttribute('data-overlay-open')
    }
  }, [isOpen, anchorRef])
}
