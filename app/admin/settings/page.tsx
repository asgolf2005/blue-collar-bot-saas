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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-muted mt-1">Manage your business settings</p>
      </div>

      <SettingsForm business={business!} technicians={technicians || []} />
    </div>
  )
}
