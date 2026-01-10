import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient'

export default async function CustomerNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    redirect('/login')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <NotificationsPageClient
      userId={user.id}
      initialNotifications={notifications || []}
      description="Updates about your appointments and payments."
    />
  )
}
