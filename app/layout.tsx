import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import ToastProvider from '@/components/providers/ToastProvider'

/**
 * Display Font - Bebas Neue
 * Used for: Headers, titles, display text
 * Characteristics: Bold, condensed, industrial aesthetic
 */
const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
})

/**
 * Sans-Serif Font - Inter
 * Used for: Body text, UI elements, descriptions
 * Characteristics: Modern, highly readable, versatile
 */
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'Blue Collar Bot - Tradie CRM',
  description: 'Professional CRM and AI Receptionist for Trade Businesses',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0e1a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body 
        className={`
          ${display.variable} 
          ${sans.variable} 
          ${mono.variable}
          font-sans
          bg-bg-primary
          text-text-primary
          min-h-screen
        `}
      >
        <ThemeProvider>
          <ToastProvider />
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
