import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateETA } from '@/lib/maps/eta-calculator'

/**
 * GET /api/tracking/eta
 * Calculate ETA for technician to reach job location
 * Query params: job_id
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const job_id = searchParams.get('job_id')

    if (!job_id) {
      return NextResponse.json({ error: 'job_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get job details with customer address
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        technician_id,
        status,
        customer:customers(address)
      `)
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.technician_id) {
      return NextResponse.json({ error: 'No technician assigned' }, { status: 400 })
    }

    const customerRelation = job.customer as { address?: string } | Array<{ address?: string }> | null
    const destinationAddress = Array.isArray(customerRelation)
      ? customerRelation[0]?.address
      : customerRelation?.address
    if (!destinationAddress) {
      return NextResponse.json({ error: 'Job address not available' }, { status: 400 })
    }

    // Get latest tech location
    const { data: location, error: locationError } = await supabase
      .from('technician_locations')
      .select('latitude, longitude, speed, recorded_at')
      .eq('technician_id', job.technician_id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (locationError || !location) {
      return NextResponse.json({ error: 'Technician location not available' }, { status: 404 })
    }

    // Check if location is stale (older than 5 minutes)
    const locationAge = Date.now() - new Date(location.recorded_at).getTime()
    if (locationAge > 5 * 60 * 1000) {
      return NextResponse.json({
        error: 'Location data is stale',
        message: 'Technician location not updated recently'
      }, { status: 404 })
    }

    // Calculate ETA
    const etaResult = await calculateETA(
      { lat: Number(location.latitude), lng: Number(location.longitude) },
      destinationAddress
    )

    if (!etaResult) {
      return NextResponse.json({
        error: 'Failed to calculate ETA'
      }, { status: 500 })
    }

    // Determine if tech is moving (speed > 1 m/s = ~2.2 mph)
    const isMoving = location.speed !== null && location.speed > 1

    return NextResponse.json({
      distance: etaResult.distance,
      duration: etaResult.withTraffic || etaResult.duration,
      arrivalTime: etaResult.arrivalTime.toISOString(),
      isMoving,
      lastUpdate: location.recorded_at
    })
  } catch (error) {
    console.error('ETA calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
