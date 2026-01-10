import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Get the invoice for this job
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching invoice:', error)
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
    }

    return NextResponse.json({ invoice: invoice || null })
  } catch (error) {
    console.error('Error in by-job route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
