import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: deletedRows, error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .select('id')

    if (error) {
      throw error
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete job error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete job' },
      { status: 500 }
    )
  }
}
