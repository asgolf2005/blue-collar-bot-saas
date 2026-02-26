'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('theme')
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'light'
}

function subscribeSystemTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => { }
  const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getSystemThemeSnapshot() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(COLOR_SCHEME_QUERY).matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const prefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    () => false
  )
  const isForcedDark = typeof window !== 'undefined' &&
    window.location.search.includes('theme=dark')

  const resolvedTheme: 'dark' | 'light' = isForcedDark ? 'dark'
    : theme === 'system' ? (prefersDark ? 'dark' : 'light')
      : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', resolvedTheme === 'dark' ? '#0b0f16' : '#f6f7f9')
    }
  }, [resolvedTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const context = useContext(ThemeContext)

  if (!context) {
    return <div className="w-11 h-11" aria-hidden="true" />
  }

  const { resolvedTheme, toggleTheme } = context

  return (
    <button type="button"
      onClick={toggleTheme}
      className={`
        relative w-11 h-11 rounded-2xl
        flex items-center justify-center
        transition-all duration-200 group
        ${resolvedTheme === 'dark'
          ? 'bg-surface-900/60 hover:bg-surface-900/80 text-surface-300 hover:text-surface-50 border border-white/10'
          : 'bg-white/80 hover:bg-surface-50 text-surface-500 hover:text-ink shadow-elevation-1 border border-surface-200'
        }
        backdrop-blur
        ${className}
      `}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-500
          ${resolvedTheme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
        `}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-500
          ${resolvedTheme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
        `}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div
        className={`
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          transition-opacity duration-300 pointer-events-none
          ${resolvedTheme === 'dark'
            ? 'shadow-[inset_0_0_20px_rgba(143,179,255,0.18)]'
            : 'shadow-[inset_0_0_16px_rgba(31,58,95,0.12)]'
          }
        `}
      />
    </button>
  )
}
