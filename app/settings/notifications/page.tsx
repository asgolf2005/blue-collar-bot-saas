import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationPreferencesClient from '@/components/notifications/NotificationPreferencesClient'

export default async function NotificationPreferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's current notification preferences
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Notification Preferences</h1>
        <p className="text-muted mt-2">
          Choose which notifications you want to receive
        </p>
      </div>

      <NotificationPreferencesClient
        userId={user.id}
        initialPreferences={preferences || []}
      />
    </div>
  )
}
