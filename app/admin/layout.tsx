import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import GlobalSearch from '@/components/search/GlobalSearch'
import GlobalKeyboardShortcuts from '@/components/keyboard/GlobalKeyboardShortcuts'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role, business_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/tech/today')
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary glow */}
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[150px]" />
        {/* Secondary profit glow */}
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-success/6 rounded-full blur-[120px]" />
        {/* Tertiary accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[180px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(31, 58, 95, 0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(31, 58, 95, 0.35) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <AdminNav userName={profile.full_name} />
      <GlobalSearch />
      <GlobalKeyboardShortcuts role="admin" />

      <main className="lg:ml-20 min-h-screen relative">
        {/* Mobile top padding for header */}
        <div className="lg:hidden h-16" />
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
