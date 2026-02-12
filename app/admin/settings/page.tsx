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
      {/* Header - Matching Jobs Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            SETTINGS
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            Manage your account preferences
          </p>
        </div>
      </div>

      <SettingsForm business={business!} technicians={technicians || []} />
    </div>
  )
}
