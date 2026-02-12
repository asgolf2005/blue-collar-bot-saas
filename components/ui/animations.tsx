/**
 * Animation Components for Blue Collar Bot
 * Field service-specific animations for GPS, ETA, job status, and AI features
 */

export { default as ETABadge } from './ETABadge'
export { default as JobStatusBadge } from './JobStatusBadge'
export { default as AnimatedJobCard } from './AnimatedJobCard'

/**
 * AI Thinking Indicator Component
 * Shows animated dots when AI is processing
 */
export function AIThinking() {
  return (
    <div className="ai-thinking-container">
      <div className="ai-thinking-dot"></div>
      <div className="ai-thinking-dot"></div>
      <div className="ai-thinking-dot"></div>
    </div>
  )
}

/**
 * Tech Avatar with Arrived Celebration
 * Animates when a technician marks themselves as "arrived"
 */
export function TechAvatarArrived({
  children,
  shouldCelebrate = false
}: {
  children: React.ReactNode
  shouldCelebrate?: boolean
}) {
  return (
    <div className={shouldCelebrate ? 'tech-avatar-arrived' : ''}>
      {children}
    </div>
  )
}

/**
 * Hand-Drawn Circle SVG (Jobber-style)
 * Use to highlight new features or important callouts
 */
export function HandDrawnCircle({
  size = 100,
  strokeWidth = 3,
  color = 'rgb(59, 130, 246)',
  className = '',
}: {
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        className="hand-drawn-circle-animated"
        strokeLinecap="round"
      />
    </svg>
  )
}
