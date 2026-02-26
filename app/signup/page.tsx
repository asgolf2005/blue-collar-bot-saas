'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, ShieldCheck, Workflow } from '@/components/ui/icons'

type SignupField = {
  id: 'businessName' | 'ownerName' | 'email' | 'phone' | 'password' | 'confirmPassword'
  label: string
  type: string
  placeholder: string
  value: string
  setValue: (value: string) => void
}

function fieldClass(focused: boolean): string {
  return `h-11 w-full rounded-md border bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
    focused ? 'border-cyan-400 ring-1 ring-cyan-400/30' : 'border-slate-700 hover:border-slate-600'
  }`
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fields: SignupField[] = [
    {
      id: 'businessName',
      label: 'Business name',
      type: 'text',
      placeholder: 'Acme Plumbing Co.',
      value: businessName,
      setValue: setBusinessName,
    },
    {
      id: 'ownerName',
      label: 'Owner name',
      type: 'text',
      placeholder: 'Jordan Smith',
      value: ownerName,
      setValue: setOwnerName,
    },
    {
      id: 'email',
      label: 'Work email',
      type: 'email',
      placeholder: 'owner@acmeplumbing.com',
      value: email,
      setValue: setEmail,
    },
    {
      id: 'phone',
      label: 'Phone',
      type: 'tel',
      placeholder: '+1 (555) 000-0000',
      value: phone,
      setValue: setPhone,
    },
    {
      id: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Minimum 8 characters',
      value: password,
      setValue: setPassword,
    },
    {
      id: 'confirmPassword',
      label: 'Confirm password',
      type: 'password',
      placeholder: 'Re-enter password',
      value: confirmPassword,
      setValue: setConfirmPassword,
    },
  ]

  const visibleCount = useMemo(() => {
    let count = 1
    if (businessName.trim()) count = 2
    if (ownerName.trim()) count = 3
    if (email.trim()) count = 4
    if (phone.trim()) count = 5
    if (password.trim()) count = 6
    return count
  }, [businessName, ownerName, email, phone, password])

  const progress = Math.round((visibleCount / fields.length) * 100)

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
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
        throw new Error('Failed to create user account.')
      }

      localStorage.setItem(
        'onboarding_data',
        JSON.stringify({
          user_id: authData.user.id,
          business_name: businessName,
          owner_name: ownerName,
          email,
          phone,
        })
      )

      router.push('/onboarding')
    } catch (signupError: unknown) {
      const message = signupError instanceof Error ? signupError.message : 'Could not create account.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-200px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute bottom-[-180px] right-[-80px] h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
            backgroundSize: '58px 58px',
          }}
        />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-lg border border-slate-700 bg-slate-900/85 p-6 backdrop-blur sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">Account Setup</p>
              <h1 className="mt-2 font-display text-5xl uppercase tracking-[0.08em] text-white">Create Business Account</h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 animate-pulse-glow-cyan">
              <Workflow className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <span>Progress</span>
              <span>{visibleCount}/{fields.length}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md bg-slate-800">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {fields.slice(0, visibleCount).map((field, index) => (
              <div key={field.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-slate-300">
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type={field.type}
                  value={field.value}
                  onChange={(event) => field.setValue(event.target.value)}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={loading}
                  placeholder={field.placeholder}
                  className={fieldClass(focusedField === field.id)}
                />
              </div>
            ))}

            {visibleCount === fields.length && (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 animate-fade-in-up"
              >
                {loading ? 'Creating account...' : 'Continue'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            )}
          </form>

          {error && (
            <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Secure sign-up and role-based workspace access.</span>
          </div>

          <div className="mt-6 border-t border-slate-700 pt-4 text-sm text-slate-300">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
