'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from '@/components/ui/lucide'

type AuthMessage = { type: 'success' | 'error'; text: string } | null
type PortalRole = 'admin' | 'tech' | 'customer'
const HUD_FRAME_CLIP =
  'polygon(22px 0, calc(100% - 22px) 0, 100% 22px, 100% calc(100% - 22px), calc(100% - 22px) 100%, 22px 100%, 0 calc(100% - 22px), 0 22px)'
const HUD_INNER_CLIP =
  'polygon(18px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px), 0 18px)'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [selectedRole, setSelectedRole] = useState<PortalRole>('admin')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [message, setMessage] = useState<AuthMessage>(null)
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

      const accountRole = profile?.role as PortalRole | undefined

      if (accountRole && accountRole !== selectedRole) {
        await supabase.auth.signOut()
        throw new Error(
          `This account is registered as ${accountRole.toUpperCase()}. Switch role and try again.`
        )
      }

      // Some customer accounts may not have a users role row.
      if (!accountRole && selectedRole === 'customer') {
        const { data: customerProfile } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', data.user.id)
          .single()

        if (!customerProfile) {
          await supabase.auth.signOut()
          throw new Error('No customer profile found for this account.')
        }
        router.push('/customer')
      } else {
        if (!accountRole) {
          await supabase.auth.signOut()
          throw new Error('No role is configured for this account.')
        }

        if (selectedRole === 'admin') {
          router.push('/admin/jobs')
        } else if (selectedRole === 'tech') {
          router.push('/tech/today')
        } else {
          router.push('/customer')
        }
      }

      router.refresh()
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'Invalid email or password'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/25 blur-[130px]" />
        <div className="absolute bottom-[-200px] left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_42%)]" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.34) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.34) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <main className="relative flex h-[100dvh] items-center justify-center px-4 py-3 sm:px-6">
        <div className="w-full max-w-[500px] [@media(max-height:900px)]:scale-[0.94] [@media(max-height:900px)]:origin-center [@media(max-height:820px)]:scale-[0.88]">
          <div className="mb-4 text-center [@media(max-height:900px)]:mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/90">Blue Collar Bot</p>
            <h1 className="mt-2 font-display text-[44px] leading-none tracking-[0.08em] text-white sm:text-[48px] [@media(max-height:900px)]:text-[38px]">Access Portal</h1>
          </div>

          <div
            className="relative p-[1px] shadow-[0_16px_40px_rgba(11,43,84,0.45)]"
            style={{
              clipPath: HUD_FRAME_CLIP,
              background:
                'linear-gradient(140deg, rgba(150,205,246,0.78) 0%, rgba(87,155,218,0.72) 45%, rgba(39,108,181,0.82) 100%)',
            }}
          >
            <div
              className="relative overflow-hidden bg-[#1f66b8]/94 p-5 backdrop-blur-xl sm:p-6 [@media(max-height:900px)]:p-4"
              style={{ clipPath: HUD_INNER_CLIP }}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-16 top-[-64px] h-32 w-32 rounded-full bg-[#9ad0f8]/28 blur-3xl" />
                <div className="absolute -right-20 bottom-[-68px] h-32 w-32 rounded-full bg-[#69afe8]/24 blur-3xl" />
                <div className="absolute left-1/2 top-0 h-[2px] w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#a9d8fb] to-transparent opacity-90" />
              </div>

              <div className="pointer-events-none absolute inset-0" style={{ clipPath: HUD_INNER_CLIP }}>
                <div className="absolute inset-[10px] border border-[#97cef7]/35" style={{ clipPath: HUD_INNER_CLIP }} />
                <div className="absolute left-3 top-3 h-4 w-4 border-l border-t border-[#a8d8fb]/90" />
                <div className="absolute right-3 top-3 h-4 w-4 border-r border-t border-[#a8d8fb]/90" />
                <div className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-[#a8d8fb]/90" />
                <div className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-[#a8d8fb]/90" />
              </div>

              <div className="relative">
              <div className="mb-4 text-center [@media(max-height:900px)]:mb-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/85">Secure Login Node</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white [@media(max-height:900px)]:text-[28px]">Welcome back</h2>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/90">
                    Sign In As
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#89c7f4]/40 bg-[#174f97]/60 p-1">
                    {(['admin', 'tech', 'customer'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role)
                          setMessage(null)
                        }}
                        className={`rounded-lg px-2 py-1.5 text-[10px] font-mono uppercase tracking-wide transition ${
                          selectedRole === role
                            ? 'bg-[#9ad0f8]/28 text-white shadow-[inset_0_0_0_1px_rgba(169,216,251,0.9)]'
                            : 'text-[#d5eaff]/85 hover:bg-[#2a6fb8]/55 hover:text-white'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className={`mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                      focusedField === 'email' ? 'text-cyan-300' : 'text-white/90'
                    }`}
                  >
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bfe2fc]/85" />
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
                      className={`h-10 w-full rounded-xl border bg-[#18579f]/70 pl-10 pr-3 text-[13px] text-white outline-none transition placeholder:text-[#c5e2f8]/75 ${
                        focusedField === 'email'
                          ? 'border-[#a8d8fb] ring-2 ring-[#a8d8fb]/30'
                          : 'border-[#84bee9]/45 hover:border-[#a8d8fb]/70'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className={`font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        focusedField === 'password' ? 'text-cyan-300' : 'text-white/90'
                      }`}
                    >
                      Password
                    </label>
                    <a href="#" className="text-xs text-[#c1e1fb]/90 transition hover:text-white">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bfe2fc]/85" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      className={`h-10 w-full rounded-xl border bg-[#18579f]/70 pl-10 pr-11 text-[13px] text-white outline-none transition placeholder:text-[#c5e2f8]/75 ${
                        focusedField === 'password'
                          ? 'border-[#a8d8fb] ring-2 ring-[#a8d8fb]/30'
                          : 'border-[#84bee9]/45 hover:border-[#a8d8fb]/70'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#b5dbfa]/85 transition hover:bg-[#2a6fb8]/55 hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <label className="group flex items-center justify-between gap-3 rounded-xl border border-[#8bc5f3]/45 bg-[#18559d]/65 px-3 py-2 transition hover:border-[#a8d8fb]/70 hover:bg-[#205fa7]/75">
                  <span className="flex items-center gap-3">
                    <span className="relative inline-flex h-6 w-11 items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="h-6 w-11 rounded-full border border-[#7db8e7]/55 bg-[#184b88] transition peer-checked:border-[#a8d8fb]/80 peer-checked:bg-[#8cc8f4]/32" />
                      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-[#e4f4ff] transition peer-checked:translate-x-5 peer-checked:bg-white" />
                    </span>
                    <span className="text-[13px] font-medium text-white">Keep me signed in</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300/95">
                    Trusted
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  </span>
                </label>

                {message && (
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      message.type === 'success'
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-400/50 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                    loading
                      ? 'cursor-not-allowed bg-slate-700 text-slate-300'
                      : 'bg-gradient-to-r from-[#5eaee8] to-[#2f7fcb] text-white shadow-elevation-2 hover:from-[#74bdef] hover:to-[#4494dd]'
                  }`}
                >
                  {loading ? 'Signing in...' : 'Enter Workspace'}
                  {!loading && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
                </button>
              </form>

              <div className="mt-4 border-t border-[#8bc5f3]/40 pt-3 text-center text-xs text-slate-200">
                Need an account?{' '}
                <Link href="/signup" className="font-semibold text-[#b5dbfa] hover:text-white">
                  Create business account
                </Link>
              </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-200/70 [@media(max-height:900px)]:hidden">
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1">Realtime CRM</span>
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1">Dispatch AI</span>
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1">Instant Invoices</span>
          </div>
        </div>
      </main>
    </div>
  )
}

