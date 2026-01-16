import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TechnicianSchedule from '@/components/admin/TechnicianSchedule'
import UpcomingJobs from '@/components/admin/UpcomingJobs'
import RecentCustomers from '@/components/admin/RecentCustomers'
import AdminAssistant from '@/components/admin/AdminAssistant'
import { LayoutDashboard, Users, FileText, Search, Bell, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/tech/today')
  }

  // Fetch recent jobs (last 90 days) for performance
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      technician:users(*),
      services:job_services(service:services(*))
    `)
    .eq('business_id', profile.business_id)
    .gte('scheduled_start', threeMonthsAgo.toISOString())
    .order('scheduled_start', { ascending: false })
    .limit(500) // Max 500 jobs

  if (jobsError) {
    console.error('Jobs query error:', jobsError)
  }

  // Fetch all technicians for the team display
  const { data: technicians } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .eq('business_id', profile.business_id)
    .eq('role', 'tech')
    .limit(5)

  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
      {/* Top Navigation Bar */}
      <nav
        style={{
          height: 'var(--nav-height)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-xs)',
          padding: '0 var(--spacing-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
        }}
      >
        {/* Left - Logo & Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--blue-100)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
              <div style={{ width: '3px', height: '12px', background: 'linear-gradient(to top, #3B82F6, #60A5FA)', borderRadius: '2px' }} />
              <div style={{ width: '5px', height: '18px', background: 'linear-gradient(to top, #3B82F6, #60A5FA)', borderRadius: '2px' }} />
              <div style={{ width: '4px', height: '15px', background: 'linear-gradient(to top, #3B82F6, #60A5FA)', borderRadius: '2px' }} />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              background: 'var(--gray-100)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-1)',
              display: 'flex',
              gap: 'var(--spacing-1)',
            }}
          >
            <Link
              href="/admin/jobs"
              style={{
                height: 'var(--button-md)',
                padding: '0 var(--spacing-4)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--gray-900)',
                boxShadow: 'var(--shadow-xs)',
                textDecoration: 'none',
              }}
            >
              <LayoutDashboard style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
              Dashboard
            </Link>

            <Link
              href="/admin/team"
              style={{
                height: 'var(--button-md)',
                padding: '0 var(--spacing-4)',
                background: 'transparent',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--gray-600)',
                textDecoration: 'none',
              }}
              className="hover:text-[#111827]"
            >
              <Users style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
              Employees
            </Link>

            <Link
              href="/admin/analytics"
              style={{
                height: 'var(--button-md)',
                padding: '0 var(--spacing-4)',
                background: 'transparent',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--gray-600)',
                textDecoration: 'none',
              }}
              className="hover:text-[#111827]"
            >
              <FileText style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
              Analytics
            </Link>
          </div>

          {/* Search */}
          <button
            style={{
              width: 'var(--button-md)',
              height: 'var(--button-md)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--gray-50)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search style={{ width: 'var(--icon-md)', height: 'var(--icon-md)', color: 'var(--gray-600)' }} />
          </button>
        </div>

        {/* Right - Team & Profile */}
        <div className="flex items-center gap-3">
          {/* Team Avatars */}
          <div className="flex items-center">
            {technicians?.slice(0, 3).map((tech, idx) => (
              <div
                key={tech.id}
                style={{
                  width: 'var(--avatar-sm)',
                  height: 'var(--avatar-sm)',
                  borderRadius: 'var(--radius-full)',
                  border: '2px solid white',
                  marginLeft: idx > 0 ? '-8px' : '0',
                  background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'white',
                }}
              >
                {tech.full_name?.charAt(0) || 'T'}
              </div>
            ))}
            {(technicians?.length || 0) > 3 && (
              <div
                style={{
                  width: 'var(--avatar-sm)',
                  height: 'var(--avatar-sm)',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--gray-100)',
                  marginLeft: '-8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-600)',
                }}
              >
                +{(technicians?.length || 0) - 3}
              </div>
            )}
          </div>

          {/* Add Employee Button */}
          <Link
            href="/admin/team"
            style={{
              height: 'var(--button-md)',
              padding: '0 var(--spacing-4)',
              background: 'var(--bg-card)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
              fontSize: 'var(--text-md)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--gray-900)',
              transition: 'var(--transition-base)',
              textDecoration: 'none',
            }}
            className="hover:border-[#3B82F6]/40"
          >
            <Plus style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
            Add Employee
          </Link>

          {/* Profile & Notification */}
          <div className="flex items-center gap-3">
            <button
              style={{
                width: 'var(--avatar-md)',
                height: 'var(--avatar-md)',
                borderRadius: 'var(--radius-full)',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell style={{ width: 'var(--icon-lg)', height: 'var(--icon-lg)', color: 'var(--gray-600)' }} />
            </button>

            <div
              style={{
                width: 'var(--avatar-md)',
                height: 'var(--avatar-md)',
                borderRadius: 'var(--radius-full)',
                border: '2px solid var(--gray-200)',
                background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                color: 'white',
              }}
            >
              {profile.full_name?.charAt(0) || 'A'}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: 'var(--spacing-6)' }}>
        {/* Technician Schedule - Full Width */}
        <div className="mb-8">
          <TechnicianSchedule jobs={jobs || []} businessId={profile.business_id} />
        </div>

        {/* Bottom Section - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Jobs */}
          <div>
            <UpcomingJobs jobs={jobs || []} />
          </div>

          {/* Recent Customers */}
          <div>
            <RecentCustomers jobs={jobs || []} />
          </div>

          {/* Admin Assistant */}
          <div>
            <AdminAssistant userName={profile.full_name?.split(' ')[0] || 'Admin'} />
          </div>
        </div>
      </div>
    </div>
  )
}
