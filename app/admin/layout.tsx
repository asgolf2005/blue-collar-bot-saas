import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e1a] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Light Mode - Subtle Dot Pattern */}
      <div className="fixed inset-0 pointer-events-none dark:hidden opacity-[0.4]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Dark Mode - Blueprint Grid */}
      <div className="fixed inset-0 pointer-events-none hidden dark:block opacity-[0.15]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(34, 211, 238, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 211, 238, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* Accent Glow - Dark Mode Only */}
      <div className="fixed top-0 right-0 w-[600px] h-[500px] opacity-0 dark:opacity-[0.08] pointer-events-none transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-bl from-cyan-400 to-transparent blur-[100px]" />
      </div>

      <AdminNav userName={profile.full_name} />
      
      <ErrorBoundary>
        <main className="lg:ml-[72px] min-h-screen pt-24 lg:pt-8 px-4 lg:px-6 pb-12 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </ErrorBoundary>
    </div>
  )
}
