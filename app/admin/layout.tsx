import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

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

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Only admin and office roles can access admin panel
  if (!profile || (profile.role !== 'admin' && profile.role !== 'office')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#030712] text-slate-900 dark:text-slate-200 transition-colors duration-500 overflow-x-hidden">
      {/* 2026 Spatial Lighting Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/8 blur-[72px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/8 blur-[96px] rounded-full mix-blend-screen" />

        {/* Subtle grid mesh */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <AdminNav userName={profile.full_name} />

        {/* Added lg:pl-32 so the sidebar doesn't overlap the child pages! */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto pt-24 lg:pt-8 px-4 sm:px-6 lg:px-8 lg:pl-32 pb-32">
          {children}
        </main>
      </div>
    </div>
  )
}
