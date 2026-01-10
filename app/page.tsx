import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
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

  // ✅ SECURITY: Route all user roles to their appropriate dashboards
  if (profile?.role === 'admin') {
    redirect('/admin/jobs')
  } else if (profile?.role === 'tech') {
    redirect('/tech/today')
  } else if (profile?.role === 'customer') {
    redirect('/customer')
  }

  // If no valid role found, redirect to login
  redirect('/login')
}
