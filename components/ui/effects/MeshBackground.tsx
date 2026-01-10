'use client'

interface MeshBackgroundProps {
  variant?: 'default' | 'subtle' | 'vibrant'
  animated?: boolean
}

export function MeshBackground({ variant = 'default', animated = true }: MeshBackgroundProps) {
  const variants = {
    default: {
      lightColors: [
        'rgba(37, 99, 235, 0.12)',   // Primary blue
        'rgba(99, 102, 241, 0.10)',   // Indigo
        'rgba(245, 158, 11, 0.08)',   // Amber accent
        'rgba(16, 185, 129, 0.06)',   // Success green
      ],
      darkColors: [
        'rgba(37, 99, 235, 0.20)',
        'rgba(59, 130, 246, 0.15)',
        'rgba(245, 158, 11, 0.10)',
        'rgba(16, 185, 129, 0.08)',
      ],
      blur: 80,
    },
    subtle: {
      lightColors: [
        'rgba(37, 99, 235, 0.08)',
        'rgba(99, 102, 241, 0.06)',
        'rgba(245, 158, 11, 0.04)',
        'rgba(16, 185, 129, 0.03)',
      ],
      darkColors: [
        'rgba(37, 99, 235, 0.12)',
        'rgba(59, 130, 246, 0.10)',
        'rgba(245, 158, 11, 0.06)',
        'rgba(16, 185, 129, 0.04)',
      ],
      blur: 100,
    },
    vibrant: {
      lightColors: [
        'rgba(37, 99, 235, 0.18)',
        'rgba(99, 102, 241, 0.15)',
        'rgba(245, 158, 11, 0.12)',
        'rgba(16, 185, 129, 0.10)',
      ],
      darkColors: [
        'rgba(37, 99, 235, 0.30)',
        'rgba(59, 130, 246, 0.25)',
        'rgba(245, 158, 11, 0.18)',
        'rgba(16, 185, 129, 0.12)',
      ],
      blur: 60,
    },
  }

  const config = variants[variant]

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Premium light mode base - soft warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      {/* Light mode: Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20" />

      {/* Animated mesh blobs - Light mode */}
      <div
        className={`absolute inset-[-50%] dark:hidden ${animated ? 'animate-mesh-float' : ''}`}
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 30%, ${config.lightColors[0]} 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 75% 15%, ${config.lightColors[1]} 0%, transparent 55%),
            radial-gradient(ellipse 60% 70% at 40% 85%, ${config.lightColors[2]} 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 85% 75%, ${config.lightColors[0]} 0%, transparent 50%),
            radial-gradient(ellipse 40% 50% at 10% 70%, ${config.lightColors[3]} 0%, transparent 50%)
          `,
          filter: `blur(${config.blur}px)`,
        }}
      />

      {/* Animated mesh blobs - Dark mode */}
      <div
        className={`absolute inset-[-50%] hidden dark:block ${animated ? 'animate-mesh-float' : ''}`}
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 30%, ${config.darkColors[0]} 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 75% 15%, ${config.darkColors[1]} 0%, transparent 55%),
            radial-gradient(ellipse 60% 70% at 40% 85%, ${config.darkColors[2]} 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 85% 75%, ${config.darkColors[0]} 0%, transparent 50%),
            radial-gradient(ellipse 40% 50% at 10% 70%, ${config.darkColors[3]} 0%, transparent 50%)
          `,
          filter: `blur(${config.blur}px)`,
        }}
      />

      {/* Light mode: Soft vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(241,245,249,0.4)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.3)_100%)]" />

      {/* Refined grid pattern - more subtle in light mode */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(37, 99, 235, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Noise texture for premium feel */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
