import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient'

export default async function TechNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/admin/jobs')
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
      description="Work updates and reminders from your assignments."
    />
  )
}
