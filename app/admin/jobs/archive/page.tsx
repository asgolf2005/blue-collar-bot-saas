import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Archive, ArrowLeft } from 'lucide-react'
import { LocalDateTimeText } from '@/components/ui/LocalDateTimeText'
import { JobsArchiveClient } from '@/components/admin/JobsArchiveClient'

export const dynamic = 'force-dynamic'

async function fetchAllJobsInArchive({
    supabase,
    businessId,
    limit = 2000
}: {
    supabase: Awaited<ReturnType<typeof createClient>>
    businessId: string
    limit?: number
}) {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
      id,
      business_id,
      customer_id,
      technician_id,
      status,
      scheduled_start,
      scheduled_end,
      description,
      urgency,
      updated_at,
      customer:customers(id,name),
      technician:users(id,full_name),
      services:job_services(service:services(id,name))
    `)
        .eq('business_id', businessId)
        .order('scheduled_start', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data || []
}

export default async function JobsArchivePage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') redirect('/tech/today')

    const jobs = await fetchAllJobsInArchive({
        supabase,
        businessId: profile.business_id,
    })

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 h-full flex flex-col">
            {/* Header Section */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-20 shrink-0">
                <div>
                    <Link href="/admin/jobs" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors mb-4">
                        <ArrowLeft className="w-3 h-3" />
                        Back to Pipeline
                    </Link>
                    <h1 className="text-4xl font-display font-bold tracking-wider text-slate-900 dark:text-white drop-shadow-sm uppercase flex items-center gap-4">
                        Global Archive
                    </h1>
                    <p className="mt-2 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-cyan-600 dark:text-cyan-400 uppercase font-medium">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                        HISTORICAL LOG
                    </p>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="flex-1 bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 shadow-2xl shadow-slate-200/20 dark:shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden relative flex flex-col min-h-[500px]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/0 to-slate-50/20 dark:from-indigo-500/5 dark:via-transparent dark:to-cyan-500/5 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between border-b border-slate-200/50 px-8 py-6 dark:border-white/10 shrink-0">
                    <h2 className="font-display text-xl font-bold tracking-[0.2em] text-slate-900 dark:text-white uppercase drop-shadow-sm flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 dark:from-slate-500 dark:to-slate-700" />
                        ALL TIME RECORDS
                    </h2>
                    <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
                        <span className="font-mono text-[11px] tracking-wider font-semibold text-slate-700 dark:text-slate-300">
                            {jobs.length} RECORDS
                        </span>
                    </div>
                </div>

                <div className="relative z-10 flex-1 overflow-x-auto p-4">
                    <JobsArchiveClient jobs={jobs as any[]} />
                </div>
            </div>
        </div>
    )
}
