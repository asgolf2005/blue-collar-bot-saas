import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Update technician's current location
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a technician
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'tech') {
      return NextResponse.json({ error: 'Only technicians can update location' }, { status: 403 })
    }

    const body = await request.json()
    const { job_id, latitude, longitude, heading, speed, accuracy } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
    }

    // Upsert location (update if exists for this tech/job, insert if not)
    const { data: existingLocation } = await supabase
      .from('technician_locations')
      .select('id')
      .eq('technician_id', user.id)
      .eq('job_id', job_id)
      .single()

    let locationData
    if (existingLocation) {
      // Update existing location
      const { data, error } = await supabase
        .from('technician_locations')
        .update({
          latitude,
          longitude,
          heading: heading || null,
          speed: speed || null,
          accuracy: accuracy || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLocation.id)
        .select()
        .single()

      if (error) throw error
      locationData = data
    } else {
      // Insert new location
      const { data, error } = await supabase
        .from('technician_locations')
        .insert({
          technician_id: user.id,
          job_id: job_id || null,
          latitude,
          longitude,
          heading: heading || null,
          speed: speed || null,
          accuracy: accuracy || null
        })
        .select()
        .single()

      if (error) throw error
      locationData = data
    }

    return NextResponse.json({ success: true, location: locationData })
  } catch (error: any) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Get technician location for a job (customer access)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role, business_id')
      .eq('id', user.id)
      .single()

    // Check if customer has access to this job
    if (!userData) {
      // Check if they're a customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (customerData) {
        // Verify job belongs to this customer
        const { data: job } = await supabase
          .from('jobs')
          .select('id, status')
          .eq('id', jobId)
          .eq('customer_id', customerData.id)
          .single()

        if (!job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        // Only show location for active jobs
        if (!['on_the_way', 'arrived', 'in_progress'].includes(job.status)) {
          return NextResponse.json({ error: 'Location not available for this job status' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (userData.role === 'admin') {
      // Admin can view any job in their business
      const { data: job } = await supabase
        .from('jobs')
        .select('id, business_id')
        .eq('id', jobId)
        .eq('business_id', userData.business_id)
        .single()

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
    }

    // Get the latest location for this job
    const { data: location, error } = await supabase
      .from('technician_locations')
      .select('*')
      .eq('job_id', jobId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ location: location || null })
  } catch (error: any) {
    console.error('Error getting location:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Clear location tracking for a job (when job completed)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    // Delete location record for this job
    const { error } = await supabase
      .from('technician_locations')
      .delete()
      .eq('technician_id', user.id)
      .eq('job_id', jobId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting location:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
