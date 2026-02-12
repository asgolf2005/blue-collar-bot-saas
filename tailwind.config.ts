import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* ========================================
         COLORS - INDUSTRIAL FUTURISM
         ======================================== */
      colors: {
        // Core Backgrounds
        'bg-primary': 'rgb(var(--bg-primary) / <alpha-value>)',
        'bg-secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
        'bg-tertiary': 'rgb(var(--bg-tertiary) / <alpha-value>)',
        'bg-card': 'rgb(var(--bg-card) / <alpha-value>)',
        'bg-hover': 'rgb(var(--bg-hover) / <alpha-value>)',
        
        // Text Colors
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        'text-disabled': 'rgb(var(--text-disabled) / <alpha-value>)',
        
        // Border Colors
        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
        'border-default': 'rgb(var(--border-default) / <alpha-value>)',
        'border-focus': 'rgb(var(--border-focus) / <alpha-value>)',
        
        // Neon Accents
        'neon-cyan': 'rgb(var(--neon-cyan) / <alpha-value>)',
        'neon-amber': 'rgb(var(--neon-amber) / <alpha-value>)',
        'neon-emerald': 'rgb(var(--neon-emerald) / <alpha-value>)',
        'neon-purple': 'rgb(var(--neon-purple) / <alpha-value>)',
        'neon-rose': 'rgb(var(--neon-rose) / <alpha-value>)',
        
        // Cyan Scale
        'cyan-50': 'rgb(var(--cyan-50) / <alpha-value>)',
        'cyan-100': 'rgb(var(--cyan-100) / <alpha-value>)',
        'cyan-200': 'rgb(var(--cyan-200) / <alpha-value>)',
        'cyan-300': 'rgb(var(--cyan-300) / <alpha-value>)',
        'cyan-400': 'rgb(var(--cyan-400) / <alpha-value>)',
        'cyan-500': 'rgb(var(--cyan-500) / <alpha-value>)',
        'cyan-600': 'rgb(var(--cyan-600) / <alpha-value>)',
        'cyan-700': 'rgb(var(--cyan-700) / <alpha-value>)',
        'cyan-800': 'rgb(var(--cyan-800) / <alpha-value>)',
        'cyan-900': 'rgb(var(--cyan-900) / <alpha-value>)',
        
        // Amber Scale
        'amber-50': 'rgb(var(--amber-50) / <alpha-value>)',
        'amber-100': 'rgb(var(--amber-100) / <alpha-value>)',
        'amber-200': 'rgb(var(--amber-200) / <alpha-value>)',
        'amber-300': 'rgb(var(--amber-300) / <alpha-value>)',
        'amber-400': 'rgb(var(--amber-400) / <alpha-value>)',
        'amber-500': 'rgb(var(--amber-500) / <alpha-value>)',
        'amber-600': 'rgb(var(--amber-600) / <alpha-value>)',
        'amber-700': 'rgb(var(--amber-700) / <alpha-value>)',
        'amber-800': 'rgb(var(--amber-800) / <alpha-value>)',
        'amber-900': 'rgb(var(--amber-900) / <alpha-value>)',
        
        // Emerald Scale
        'emerald-50': 'rgb(var(--emerald-50) / <alpha-value>)',
        'emerald-100': 'rgb(var(--emerald-100) / <alpha-value>)',
        'emerald-200': 'rgb(var(--emerald-200) / <alpha-value>)',
        'emerald-300': 'rgb(var(--emerald-300) / <alpha-value>)',
        'emerald-400': 'rgb(var(--emerald-400) / <alpha-value>)',
        'emerald-500': 'rgb(var(--emerald-500) / <alpha-value>)',
        'emerald-600': 'rgb(var(--emerald-600) / <alpha-value>)',
        'emerald-700': 'rgb(var(--emerald-700) / <alpha-value>)',
        'emerald-800': 'rgb(var(--emerald-800) / <alpha-value>)',
        'emerald-900': 'rgb(var(--emerald-900) / <alpha-value>)',
        
        // Purple Scale
        'purple-50': 'rgb(var(--purple-50) / <alpha-value>)',
        'purple-100': 'rgb(var(--purple-100) / <alpha-value>)',
        'purple-200': 'rgb(var(--purple-200) / <alpha-value>)',
        'purple-300': 'rgb(var(--purple-300) / <alpha-value>)',
        'purple-400': 'rgb(var(--purple-400) / <alpha-value>)',
        'purple-500': 'rgb(var(--purple-500) / <alpha-value>)',
        'purple-600': 'rgb(var(--purple-600) / <alpha-value>)',
        'purple-700': 'rgb(var(--purple-700) / <alpha-value>)',
        'purple-800': 'rgb(var(--purple-800) / <alpha-value>)',
        'purple-900': 'rgb(var(--purple-900) / <alpha-value>)',
        
        // Rose Scale
        'rose-50': 'rgb(var(--rose-50) / <alpha-value>)',
        'rose-100': 'rgb(var(--rose-100) / <alpha-value>)',
        'rose-200': 'rgb(var(--rose-200) / <alpha-value>)',
        'rose-300': 'rgb(var(--rose-300) / <alpha-value>)',
        'rose-400': 'rgb(var(--rose-400) / <alpha-value>)',
        'rose-500': 'rgb(var(--rose-500) / <alpha-value>)',
        'rose-600': 'rgb(var(--rose-600) / <alpha-value>)',
        'rose-700': 'rgb(var(--rose-700) / <alpha-value>)',
        'rose-800': 'rgb(var(--rose-800) / <alpha-value>)',
        'rose-900': 'rgb(var(--rose-900) / <alpha-value>)',
        
        // Legacy colors (for backwards compatibility)
        midnight: {
          950: '#0a0e1a',
          900: '#0f172a',
          800: '#1e293b',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        electric: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        profit: {
          400: '#34d399',
          500: '#10b981',
        },
        loss: {
          400: '#f87171',
          500: '#ef4444',
        },
        canvas: 'rgb(var(--bg-primary) / <alpha-value>)',
        border: 'rgb(var(--border-default) / <alpha-value>)',
        ink: 'rgb(var(--text-primary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        success: 'rgb(var(--neon-emerald) / <alpha-value>)',
        warning: 'rgb(var(--neon-amber) / <alpha-value>)',
        danger: 'rgb(var(--neon-rose) / <alpha-value>)',
        info: 'rgb(var(--neon-cyan) / <alpha-value>)',
      },
      
      /* ========================================
         TYPOGRAPHY
         ======================================== */
      fontFamily: {
        display: ['var(--font-display)', 'Bebas Neue', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        // Display
        'display-xl': ['6rem', { lineHeight: '1', letterSpacing: '0.05em' }],
        'display-lg': ['4.5rem', { lineHeight: '1', letterSpacing: '0.05em' }],
        'display-md': ['3.75rem', { lineHeight: '1', letterSpacing: '0.05em' }],
        'display-sm': ['3rem', { lineHeight: '1', letterSpacing: '0.05em' }],
        // Headings
        'heading-xl': ['2.25rem', { lineHeight: '1.25' }],
        'heading-lg': ['1.875rem', { lineHeight: '1.25' }],
        'heading-md': ['1.5rem', { lineHeight: '1.375' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.375' }],
        'heading-xs': ['1.125rem', { lineHeight: '1.375' }],
      },
      
      /* ========================================
         SPACING (Generous)
         ======================================== */
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '46': '11.5rem',
        '50': '12.5rem',
      },
      
      gap: {
        'generous': '1.5rem',
        'generous-lg': '2rem',
        'generous-xl': '3rem',
      },
      
      padding: {
        'generous': '1.5rem',
        'generous-lg': '2rem',
        'generous-xl': '3rem',
      },
      
      /* ========================================
         ANIMATIONS
         ======================================== */
      animation: {
        // Entrance animations
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        
        // Glow animations
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-glow-cyan': 'pulseGlowCyan 2s ease-in-out infinite',
        'pulse-glow-emerald': 'pulseGlowEmerald 2s ease-in-out infinite',
        'pulse-glow-amber': 'pulseGlowAmber 2s ease-in-out infinite',
        
        // Status animations
        'status-pulse': 'statusPulse 2s ease-in-out infinite',
        
        // Grid animation
        'grid-pan': 'blueprintGridPan 60s linear infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(34, 211, 238, 0.2), 0 0 10px rgba(34, 211, 238, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.4), 0 0 30px rgba(34, 211, 238, 0.2)' 
          },
        },
        pulseGlowCyan: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(34, 211, 238, 0.2), 0 0 10px rgba(34, 211, 238, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.4), 0 0 30px rgba(34, 211, 238, 0.2)' 
          },
        },
        pulseGlowEmerald: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(34, 197, 94, 0.2), 0 0 10px rgba(34, 197, 94, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.2)' 
          },
        },
        pulseGlowAmber: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(251, 191, 36, 0.2), 0 0 10px rgba(251, 191, 36, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 15px rgba(251, 191, 36, 0.4), 0 0 30px rgba(251, 191, 36, 0.2)' 
          },
        },
        statusPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(2)', opacity: '0' },
        },
        blueprintGridPan: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(40px, 40px)' },
        },
      },
      
      /* ========================================
         TRANSITIONS
         ======================================== */
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-circ': 'cubic-bezier(0.85, 0, 0.15, 1)',
        'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      /* ========================================
         BOX SHADOWS
         ======================================== */
      boxShadow: {
        // Neon glows
        'neon-cyan': '0 0 10px rgba(34, 211, 238, 0.3), 0 0 30px rgba(34, 211, 238, 0.2), 0 0 60px rgba(34, 211, 238, 0.1)',
        'neon-amber': '0 0 10px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.2), 0 0 60px rgba(251, 191, 36, 0.1)',
        'neon-emerald': '0 0 10px rgba(34, 197, 94, 0.3), 0 0 30px rgba(34, 197, 94, 0.2), 0 0 60px rgba(34, 197, 94, 0.1)',
        'neon-purple': '0 0 10px rgba(168, 85, 247, 0.3), 0 0 30px rgba(168, 85, 247, 0.2), 0 0 60px rgba(168, 85, 247, 0.1)',
        'neon-rose': '0 0 10px rgba(244, 63, 94, 0.3), 0 0 30px rgba(244, 63, 94, 0.2), 0 0 60px rgba(244, 63, 94, 0.1)',
        
        // Elevation
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'elevation-3': '0 8px 24px rgba(0, 0, 0, 0.5)',
        
        // Glass
        'glass': '0 12px 30px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 20px 45px rgba(0, 0, 0, 0.4)',
      },
      
      /* ========================================
         BACKDROP BLUR
         ======================================== */
      backdropBlur: {
        'glass': '12px',
      },
      
      /* ========================================
         BORDER RADIUS
         ======================================== */
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      
      /* ========================================
         BACKGROUND IMAGES
         ======================================== */
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero': 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, transparent 50%, rgba(168, 85, 247, 0.1) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
      },
    },
  },
  plugins: [],
}
export default config
