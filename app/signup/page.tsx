'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form data
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: ownerName,
            business_name: businessName,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      localStorage.setItem('onboarding_data', JSON.stringify({
        user_id: authData.user.id,
        business_name: businessName,
        owner_name: ownerName,
        email,
        phone,
      }))

      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputFields = [
    { id: 'businessName', label: 'Business Name', type: 'text', value: businessName, setter: setBusinessName, placeholder: 'Acme Plumbing Co.' },
    { id: 'ownerName', label: 'Your Name', type: 'text', value: ownerName, setter: setOwnerName, placeholder: 'John Smith' },
    { id: 'email', label: 'Email', type: 'email', value: email, setter: setEmail, placeholder: 'john@acmeplumbing.com' },
    { id: 'phone', label: 'Phone', type: 'tel', value: phone, setter: setPhone, placeholder: '+1 (555) 000-0000' },
    { id: 'password', label: 'Password', type: 'password', value: password, setter: setPassword, placeholder: 'Min 8 characters' },
    { id: 'confirmPassword', label: 'Confirm Password', type: 'password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Re-enter password' },
  ]

  const features = [
    { icon: '📊', title: 'Profit Analytics', desc: 'Real-time P&L tracking' },
    { icon: '🤖', title: 'AI Receptionist', desc: '24/7 automated booking' },
    { icon: '📍', title: 'GPS Tracking', desc: 'Live technician locations' },
    { icon: '💳', title: 'Smart Invoicing', desc: 'Instant payment collection' },
  ]

  return (
    <div className="min-h-screen flex overflow-hidden bg-midnight-950">
      {/* Left Panel - Features Showcase */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 230, 118, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 230, 118, 0.02) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />

          {/* Glowing orbs */}
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-profit-500/8 blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-electric-500/6 blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-electric-500 to-profit-500 flex items-center justify-center shadow-elevation-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Blue Collar Bot</span>
          </div>

          {/* Hero Content */}
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Run your trade
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-profit-400 via-neon-green to-electric-400">
                business smarter
              </span>
            </h1>

            <p className="mt-6 text-lg text-surface-400 leading-relaxed">
              The complete platform for plumbers, electricians, HVAC techs, and contractors. Automate operations, track profits, grow revenue.
            </p>

            {/* Feature Grid */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-midnight-900/50 backdrop-blur border border-white/5 hover:border-electric-500/20 transition-colors"
                >
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <div className="text-white font-semibold text-sm">{feature.title}</div>
                  <div className="text-surface-500 text-xs mt-0.5">{feature.desc}</div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-8 flex gap-8">
              {[
                { value: '2,400+', label: 'Businesses' },
                { value: '$47M+', label: 'Revenue tracked' },
                { value: '4.9/5', label: 'Rating' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl font-bold font-mono text-white">{stat.value}</div>
                  <div className="text-xs text-surface-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-midnight-900/40 border border-white/5 text-surface-400 text-sm">
              <svg className="w-4 h-4 text-profit-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-midnight-900/40 border border-white/5 text-surface-400 text-sm">
              <svg className="w-4 h-4 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              14-day free trial
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-profit-500/5 blur-[100px]" />
        </div>

        <div className="w-full max-w-[420px] relative z-10 py-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 to-profit-500 flex items-center justify-center shadow-elevation-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">Blue Collar Bot</span>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Start your free trial
              </h2>
            </div>
            <p className="text-surface-400">14 days free. No credit card required.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {inputFields.map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={field.id}
                  className={`block text-sm font-medium mb-1.5 transition-colors duration-200 ${
                    focusedField === field.id ? 'text-electric-400' : 'text-surface-400'
                  }`}
                >
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type={field.type}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => setFocusedField(null)}
                  placeholder={field.placeholder}
                  required
                  disabled={loading}
                  className={`
                    w-full h-11 px-4 rounded-xl
                    bg-midnight-800/60 backdrop-blur
                    border transition-all duration-200
                    text-white text-[15px]
                    placeholder:text-surface-600
                    outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${focusedField === field.id
                      ? 'border-electric-500/50 shadow-elevation-2'
                      : 'border-white/10 hover:border-white/20'
                    }
                  `}
                />
              </div>
            ))}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-loss-500/10 border border-loss-500/30">
                <svg className="w-5 h-5 text-loss-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-loss-400 font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full h-12 rounded-xl font-semibold text-[15px]
                flex items-center justify-center gap-2
                transition-all duration-300 mt-6
                ${loading
                  ? 'bg-midnight-700 cursor-not-allowed text-surface-500'
                  : 'bg-gradient-to-r from-profit-500 to-profit-600 hover:from-profit-400 hover:to-profit-500 shadow-profit-sm hover:shadow-profit hover:-translate-y-0.5'
                }
                text-midnight-950 font-bold
              `}
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-white">Creating account...</span>
                </>
              ) : (
                <>
                  <span>Start free trial</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-surface-500 bg-midnight-950">or</span>
            </div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-surface-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-electric-400 hover:text-electric-300 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-surface-600 leading-relaxed">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-surface-400 hover:text-electric-400 transition-colors">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-surface-400 hover:text-electric-400 transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
