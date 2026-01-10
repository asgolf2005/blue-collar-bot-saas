import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CustomerNav from '@/components/customer/CustomerNav'

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('*, business:businesses(name, logo_url, primary_color)')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-success/6 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[180px]" />
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

      <CustomerNav
        customerName={customer.name}
        businessName={customer.business.name}
        businessLogo={customer.business.logo_url}
        primaryColor={customer.business.primary_color || '#2563eb'}
      />
      <main className="relative min-h-screen pb-24">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
