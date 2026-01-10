import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
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

    if (!profile || !profile.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ services })
  } catch (error: any) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const { name, description, base_price, duration_minutes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      )
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        business_id: profile.business_id,
        name,
        description: description || null,
        base_price: base_price || null,
        duration_minutes: duration_minutes || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ service }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
