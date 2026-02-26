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
        <div className="absolute -top-28 right-[18%] h-[680px] w-[680px] rounded-full bg-cyan-400/10 blur-[140px] dark:bg-cyan-400/16" />
        <div className="absolute bottom-[-260px] left-[12%] h-[680px] w-[680px] rounded-full bg-emerald-400/8 blur-[140px] dark:bg-emerald-400/12" />
        <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-white/70 via-white/35 to-transparent dark:from-slate-950/85 dark:via-slate-950/45 dark:to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(31, 58, 95, 0.28) 1px, transparent 1px),
              linear-gradient(90deg, rgba(31, 58, 95, 0.28) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <TechNav userName={profile.full_name} />
      <GlobalSearch />
      <GlobalKeyboardShortcuts role="tech" />
      <main className="relative min-h-screen pb-24 lg:pb-10">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 lg:px-10 lg:py-6 lg:pl-[104px]">
          {children}
        </div>
      </main>
    </div>
  )
}
