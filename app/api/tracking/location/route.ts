import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/tracking/location
 * Store technician location update
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a tech
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'tech') {
      return NextResponse.json({ error: 'Only technicians can share location' }, { status: 403 })
    }

    const body = await request.json()
    const { latitude, longitude, job_id, accuracy, speed, heading } = body

    // Coerce coordinate inputs and validate
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 })
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const toNumberOrNull = (value: any) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return Number.isFinite(num) ? num : null
    }

    // Insert location
    const { data, error } = await supabase
      .from('technician_locations')
      .insert({
        technician_id: user.id,
        job_id: job_id || null,
        latitude: lat,
        longitude: lng,
        accuracy: toNumberOrNull(accuracy),
        speed: toNumberOrNull(speed),
        heading: toNumberOrNull(heading)
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving location:', error)
      return NextResponse.json({ error: 'Failed to save location' }, { status: 500 })
    }

    // If location is for a specific job, trigger ETA calculation
    if (job_id) {
      // This will be handled by a separate background job or webhook
      // For now, just log it
      console.log(`Location update for job ${job_id}`)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Location tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tracking/location
 * Get technician location(s)
 * Query params:
 *   - tech_id: Get location for specific tech
 *   - business_id: Get all tech locations for business (admin only)
 *   - job_id: Get tech location for specific job (customer access)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tech_id = searchParams.get('tech_id')
    const job_id = searchParams.get('job_id')

    // Get user profile to determine access
    const { data: profile } = await supabase
      .from('users')
      .select('role, business_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let query = supabase
      .from('technician_locations')
      .select(`
        *,
        user:users!technician_locations_technician_id_fkey(
          id,
          full_name,
          phone
        ),
        job:jobs(
          id,
          customer_id,
          scheduled_start,
          scheduled_end,
          status
        )
      `)
      .order('recorded_at', { ascending: false })

    // Filter based on role and request
    if (profile.role === 'admin') {
      // Admins can see all techs in their business
      if (tech_id) {
        query = query.eq('technician_id', tech_id).limit(1)
      } else {
        // Get latest location for each tech using the function
        const { data: latestLocations, error } = await supabase
          .rpc('get_latest_tech_locations', { business_uuid: profile.business_id })

        if (error) {
          console.error('Error fetching latest locations:', error)
          return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
        }

        // Fetch job details for each location
        if (latestLocations && latestLocations.length > 0) {
          const locationsWithJobs = await Promise.all(
            latestLocations.map(async (loc) => {
              if (loc.job_id) {
                const { data: job } = await supabase
                  .from('jobs')
                  .select('id, customer:customers(address, name)')
                  .eq('id', loc.job_id)
                  .single()

                return { ...loc, job }
              }
              return loc
            })
          )

          return NextResponse.json(locationsWithJobs)
        }

        return NextResponse.json(latestLocations || [])
      }
    } else if (profile.role === 'tech') {
      // Techs can only see their own location
      query = query.eq('technician_id', user.id).limit(10)
    } else if (profile.role === 'customer') {
      // Customers can see tech location for their jobs
      if (!job_id) {
        return NextResponse.json({ error: 'job_id required for customers' }, { status: 400 })
      }

      // Verify customer has access to this job
      const { data: job } = await supabase
        .from('jobs')
        .select('customer_id')
        .eq('id', job_id)
        .single()

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!job || !customer || job.customer_id !== customer.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      query = query.eq('job_id', job_id).limit(1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Location fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
