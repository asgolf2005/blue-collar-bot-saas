/**
 * ETA Calculator using Google Maps Distance Matrix API
 * Calculates estimated time of arrival from tech location to customer address
 */

interface TechLocation {
  lat: number
  lng: number
}

interface ETAResult {
  duration: number // in seconds
  durationMinutes: number // in minutes
  distance: number // in meters
  distanceMiles: number // in miles
  arrivalTime: Date
  withTraffic?: number // duration with current traffic (seconds)
}

/**
 * Calculate ETA from tech location to destination
 */
export async function calculateETA(
  techLocation: TechLocation,
  destinationAddress: string
): Promise<ETAResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured')
    return null
  }

  try {
    // Use Distance Matrix API for accurate ETA with traffic
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.append('origins', `${techLocation.lat},${techLocation.lng}`)
    url.searchParams.append('destinations', encodeURIComponent(destinationAddress))
    url.searchParams.append('departure_time', 'now')
    url.searchParams.append('traffic_model', 'best_guess')
    url.searchParams.append('key', apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Distance Matrix API error:', data.status)
      return null
    }

    const element = data.rows[0]?.elements[0]

    if (!element || element.status !== 'OK') {
      console.error('No route found')
      return null
    }

    const duration = element.duration.value // seconds
    const distance = element.distance.value // meters
    const durationWithTraffic = element.duration_in_traffic?.value || duration

    const arrivalTime = new Date(Date.now() + durationWithTraffic * 1000)

    return {
      duration,
      durationMinutes: Math.ceil(duration / 60),
      distance,
      distanceMiles: parseFloat((distance / 1609.34).toFixed(1)),
      arrivalTime,
      withTraffic: durationWithTraffic
    }
  } catch (error) {
    console.error('ETA calculation error:', error)
    return null
  }
}

/**
 * Simple distance calculation (crow flies) - fallback if API fails
 */
export function calculateDistanceSimple(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${remainingMinutes} min`
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.34

  if (miles < 0.1) {
    return `${Math.round(meters)} m`
  }

  return `${miles.toFixed(1)} mi`
}
