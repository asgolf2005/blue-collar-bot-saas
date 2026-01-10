'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'admin') {
        router.push('/admin/jobs')
      } else if (profile?.role === 'tech') {
        router.push('/tech/today')
      } else if (profile?.role === 'customer') {
        router.push('/customer')
      } else {
        router.push('/onboarding')
      }

      router.refresh()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Invalid email or password',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-midnight-950">
      {/* Left Panel - Profit Dashboard Preview */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 195, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 195, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />

          {/* Glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-electric-500/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-profit-500/8 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-electric-600/5 blur-[80px]" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-600 flex items-center justify-center shadow-elevation-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-white">Blue Collar Bot</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-profit-500/20 text-profit-400 border border-profit-500/30">PRO</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-sm font-medium mb-6">
              <div className="w-2 h-2 rounded-full bg-profit-400 animate-pulse" />
              Real-time profit tracking
            </div>

            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Track every dollar.
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-electric-400 via-neon-cyan to-profit-400">
                Maximize profit.
              </span>
            </h1>

            <p className="mt-6 text-lg text-surface-400 leading-relaxed max-w-md">
              AI-powered business intelligence for trade professionals. See exactly where your money goes and how to make more.
            </p>

            {/* Mock Dashboard Preview */}
            <div className="mt-10 space-y-4">
              {/* Stats row */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-xl bg-midnight-900/60 backdrop-blur border border-white/5">
                  <div className="text-xs text-surface-500 uppercase tracking-wider mb-1">Today&apos;s Revenue</div>
                  <div className="text-2xl font-bold font-mono text-profit-400">$4,827</div>
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-profit-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className="text-xs font-semibold text-profit-400">+23%</span>
                  </div>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-midnight-900/60 backdrop-blur border border-white/5">
                  <div className="text-xs text-surface-500 uppercase tracking-wider mb-1">Jobs Completed</div>
                  <div className="text-2xl font-bold font-mono text-white">12</div>
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className="text-xs font-semibold text-electric-400">+4 from yesterday</span>
                  </div>
                </div>
              </div>

              {/* Mini chart */}
              <div className="p-4 rounded-xl bg-midnight-900/60 backdrop-blur border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-surface-500 uppercase tracking-wider">Weekly Trend</span>
                  <span className="text-xs font-mono text-profit-400">+$12,450</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-electric-600 to-electric-400"
                      style={{
                        height: `${height}%`,
                        opacity: i === 6 ? 1 : 0.6,
                        boxShadow: i === 6 ? '0 0 10px rgba(0, 195, 255, 0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom testimonial */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-midnight-900/40 backdrop-blur border border-white/5 max-w-md">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-electric-500 to-profit-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              JM
            </div>
            <div>
              <p className="text-surface-300 text-sm italic">&ldquo;Finally know exactly where every dollar goes. Increased profit margin by 34% in 3 months.&rdquo;</p>
              <p className="text-surface-500 text-xs mt-1">Jake Miller &mdash; Miller Electric Co.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-electric-500/5 blur-[100px]" />
        </div>

        <div className="w-full max-w-[400px] relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 to-electric-600 flex items-center justify-center shadow-elevation-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">Blue Collar Bot</span>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
              Welcome back
            </h2>
            <p className="text-surface-400">
              Sign in to access your profit dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-2 transition-colors duration-200 ${
                  focusedField === 'email' ? 'text-electric-400' : 'text-surface-400'
                }`}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@company.com"
                required
                disabled={loading}
                className={`
                  w-full h-12 px-4 rounded-xl
                  bg-midnight-800/60 backdrop-blur
                  border transition-all duration-200
                  text-white text-[15px]
                  placeholder:text-surface-600
                  outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${focusedField === 'email'
                    ? 'border-electric-500/50 shadow-elevation-2'
                    : 'border-white/10 hover:border-white/20'
                  }
                `}
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className={`block text-sm font-medium transition-colors duration-200 ${
                    focusedField === 'password' ? 'text-electric-400' : 'text-surface-400'
                  }`}
                >
                  Password
                </label>
                <a href="#" className="text-sm text-surface-500 hover:text-electric-400 transition-colors font-medium">
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your password"
                required
                disabled={loading}
                className={`
                  w-full h-12 px-4 rounded-xl
                  bg-midnight-800/60 backdrop-blur
                  border transition-all duration-200
                  text-white text-[15px]
                  placeholder:text-surface-600
                  outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${focusedField === 'password'
                    ? 'border-electric-500/50 shadow-elevation-2'
                    : 'border-white/10 hover:border-white/20'
                  }
                `}
              />
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="peer sr-only" />
                <div className="w-5 h-5 rounded-md border border-white/20 bg-midnight-800/60 peer-checked:bg-electric-500 peer-checked:border-electric-500 transition-all flex items-center justify-center">
                  <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-surface-400 group-hover:text-surface-300 transition-colors">Remember me for 30 days</span>
            </label>

            {/* Error/Success Message */}
            {message && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                message.type === 'success'
                  ? 'bg-profit-500/10 border-profit-500/30'
                  : 'bg-loss-500/10 border-loss-500/30'
              }`}>
                <svg className={`w-5 h-5 shrink-0 mt-0.5 ${
                  message.type === 'success' ? 'text-profit-400' : 'text-loss-400'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {message.type === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <span className={`text-sm font-medium ${message.type === 'success' ? 'text-profit-400' : 'text-loss-400'}`}>
                  {message.text}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full h-12 rounded-xl font-semibold text-[15px]
                flex items-center justify-center gap-2
                transition-all duration-300
                ${loading
                  ? 'bg-midnight-700 cursor-not-allowed text-surface-500'
                  : 'bg-gradient-to-r from-electric-500 to-electric-600 hover:from-electric-400 hover:to-electric-500 shadow-elevation-2 hover:shadow-elevation-3 hover:-translate-y-0.5'
                }
                text-white
              `}
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in to dashboard</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-surface-500 bg-midnight-950">or</span>
            </div>
          </div>

          {/* Sign up link */}
          <p className="text-center text-surface-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-electric-400 hover:text-electric-300 font-semibold transition-colors"
            >
              Start free trial
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-8 text-center text-xs text-surface-600 leading-relaxed">
            By signing in, you agree to our{' '}
            <a href="#" className="text-surface-400 hover:text-electric-400 transition-colors">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-surface-400 hover:text-electric-400 transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
