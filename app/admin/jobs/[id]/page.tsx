import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import JobDetailsAdmin from '@/components/admin/JobDetailsAdmin'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      technician:users(*),
      media(*)
    `)
    .eq('id', id)
    .single()

  if (!job) {
    notFound()
  }

  const { data: technicians } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'tech')
    .eq('business_id', job.business_id)

  return <JobDetailsAdmin job={job} technicians={technicians || []} />
}
