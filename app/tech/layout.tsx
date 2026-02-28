import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TechNav from '@/components/tech/TechNav'
import GlobalSearch from '@/components/search/GlobalSearch'
import GlobalKeyboardShortcuts from '@/components/keyboard/GlobalKeyboardShortcuts'

export default async function TechLayout({
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
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'tech' && profile?.role !== 'admin') {
    redirect('/admin/jobs')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Deep Spatial Background */}
        <div className="absolute inset-x-0 -top-40 h-[1000px] w-full [background:radial-gradient(ellipse_at_top,rgba(6,182,212,0.18)_0%,transparent_70%)] dark:[background:radial-gradient(ellipse_at_top,rgba(34,211,238,0.22)_0%,transparent_70%)]" />
        <div className="absolute -left-[20%] top-[40%] h-[600px] w-[600px] rounded-full bg-emerald-400/10 blur-[130px] dark:bg-emerald-400/15" />

        {/* Mesh Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(31, 58, 95, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(31, 58, 95, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <TechNav userName={profile.full_name} />
      <GlobalSearch />
      <GlobalKeyboardShortcuts role="tech" />
      <main className="relative min-h-[calc(100vh-80px)] pb-24 md:pb-10">
        <div className="mx-auto w-full max-w-lg px-3 py-4 sm:px-4 md:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
