import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import JobDetailsTech from '@/components/tech/JobDetailsTech'

export default async function TechJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/tech/today')
  }

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

  if (job.technician_id !== user.id) {
    redirect('/tech/today')
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <JobDetailsTech job={job} />
    </div>
  )
}
