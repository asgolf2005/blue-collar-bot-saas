import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import JobDetailsTech from '@/components/tech/JobDetailsTech'

export default async function TechJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      media(*)
    `)
    .eq('id', id)
    .single()

  if (!job) {
    notFound()
  }

  if (job.technician_id !== user!.id) {
    redirect('/tech/today')
  }

  return <JobDetailsTech job={job} />
}
