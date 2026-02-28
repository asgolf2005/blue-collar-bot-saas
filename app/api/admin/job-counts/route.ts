import { createClient } from '@/lib/supabase/server'
import { getAllTimeJobCounts } from '@/lib/analytics/job-counts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.business_id || (profile.role !== 'admin' && profile.role !== 'office')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const counts = await getAllTimeJobCounts({
      supabase,
      businessId: profile.business_id,
    })

    return Response.json(counts)
  } catch (error) {
    console.error('Failed to fetch job counts:', error)
    return Response.json({ error: 'Failed to fetch job counts' }, { status: 500 })
  }
}
