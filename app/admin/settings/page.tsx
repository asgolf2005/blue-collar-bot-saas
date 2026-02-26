import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user!.id)
    .single()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', profile!.business_id)
    .single()

  const { data: technicians } = await supabase
    .from('users')
    .select('*')
    .eq('business_id', profile!.business_id)
    .eq('role', 'tech')

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 px-6 py-6 shadow-elevation-1 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">
              Admin Control
            </p>
            <h1 className="admin-page-header mb-1">SETTINGS</h1>
            <p className="font-sans text-sm text-slate-600 dark:text-slate-300">
              Clean control over profile, team access, notifications, and imports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1.5 font-sans text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200">
              {business?.name || 'Business'}
            </span>
            <span className="rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1.5 font-mono text-xs text-cyan-700 dark:border-cyan-700/70 dark:bg-cyan-900/30 dark:text-cyan-300">
              {technicians?.length || 0} techs
            </span>
          </div>
        </div>
      </div>

      <SettingsForm business={business!} technicians={technicians || []} />
    </div>
  )
}

