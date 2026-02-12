# Blue Collar Bot - ServiceTitan Competitive Parity Plan

**Version:** 1.0
**Created:** January 5, 2026
**Target Completion:** 6-8 weeks
**Total Estimated Time:** 35-45 hours

---

## 🎯 Mission

Build a field service management platform that matches ServiceTitan's core capabilities at 1/5th the price, while maintaining our unique AI phone receptionist advantage.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Target State](#target-state)
4. [Implementation Phases](#implementation-phases)
5. [Feature Breakdown](#feature-breakdown)
6. [Technical Architecture](#technical-architecture)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)
9. [Success Metrics](#success-metrics)

---

## Overview

### Goal
Achieve 90%+ feature parity with ServiceTitan for small-medium businesses (1-10 technicians) within 6-8 weeks.

### Strategy
Focus on the critical features that ServiceTitan customers use daily:
- GPS tracking for real-time tech location
- Route optimization for efficient scheduling
- Visual dispatch board for job assignment
- Multiple calendar views for better visibility
- QuickBooks integration for accounting
- Offline mode for field reliability

### Success Criteria
- ✅ All Phase 1 features deployed to production
- ✅ Can demonstrate feature parity in sales demos
- ✅ First 5 customers migrated from ServiceTitan
- ✅ No critical bugs in new features
- ✅ Mobile app works offline with GPS tracking

---

## Current State

### ✅ What We Have (Production Ready)
- Multi-role authentication & security
- Admin dashboard (jobs, customers, invoices, analytics)
- Technician mobile app (schedule, status updates, photos)
- Customer portal (appointments, invoices, payments)
- **AI Phone Receptionist** (UNIQUE - ServiceTitan doesn't have)
- Stripe payment processing
- Email notifications (Resend)
- SMS notifications (Twilio)
- Real-time notifications
- Global search (Cmd+K)
- Keyboard shortcuts
- Premium glassmorphic UI with dark mode
- Bulk actions
- Loading states & empty states

### ❌ Critical Gaps vs ServiceTitan
- No GPS tracking
- No route optimization
- No visual dispatch board
- Only 1 calendar view (month)
- No QuickBooks integration
- No offline mode
- Basic analytics (not predictive)

---

## Target State

### After Phase 1 (20-25 hours)
- ✅ GPS tracking with live tech locations
- ✅ Route optimization with Google Maps
- ✅ Drag-and-drop dispatch board
- ✅ 4 calendar views (Month, Week, Day, Map)
- ✅ QuickBooks Online integration

### After Phase 2 (15-20 hours)
- ✅ Offline mode for mobile app
- ✅ Advanced analytics dashboard
- ✅ Performance optimization

### After Phase 3 (Optional - 40-60 hours)
- ✅ Native mobile apps (React Native)
- ✅ Inventory management
- ✅ Purchase orders

---

## Implementation Phases

### Phase 1: Critical Features (Weeks 1-3)
**Goal:** Close the biggest competitive gaps
**Time:** 20-25 hours
**Priority:** CRITICAL

| Week | Feature | Hours | Status |
|------|---------|-------|--------|
| 1 | GPS Technician Tracking | 3-4 | ⏳ Pending |
| 1 | Route Optimization | 4-6 | ⏳ Pending |
| 2 | Dispatch Board | 6-8 | ⏳ Pending |
| 2 | Multiple Calendar Views | 2-3 | ⏳ Pending |
| 3 | QuickBooks Integration | 6-8 | ⏳ Pending |

### Phase 2: Advanced Features (Weeks 4-5)
**Goal:** Match ServiceTitan's advanced capabilities
**Time:** 15-20 hours
**Priority:** HIGH

| Week | Feature | Hours | Status |
|------|---------|-------|--------|
| 4 | Offline Mode for Mobile | 8-10 | ⏳ Pending |
| 5 | Advanced Analytics | 8-10 | ⏳ Pending |

### Phase 3: Scale & Polish (Weeks 6-10+)
**Goal:** Exceed ServiceTitan
**Time:** 40-60 hours
**Priority:** MEDIUM

| Week | Feature | Hours | Status |
|------|---------|-------|--------|
| 6-10 | Native Mobile Apps (React Native) | 40-60 | ⏳ Pending |
| 11 | Inventory Management | 10-12 | ⏳ Pending |

---

## Feature Breakdown

---

## 1. GPS Technician Tracking

### Overview
Real-time location tracking for technicians in the field with live map display and automatic ETA calculations.

### User Stories
- **As an admin**, I want to see where all my techs are on a map, so I can assign nearby jobs efficiently
- **As a customer**, I want to see my tech's location and ETA, so I know when to expect them
- **As a tech**, I want to automatically share my location when on a job, so customers know I'm on the way

### Technical Requirements

#### Database Schema
```sql
-- Create location tracking table
CREATE TABLE technician_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tech_id UUID REFERENCES users(id) NOT NULL,
  job_id UUID REFERENCES jobs(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2), -- in meters
  speed DECIMAL(10, 2), -- in m/s
  heading DECIMAL(5, 2), -- 0-360 degrees
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_tech_locations_tech_id ON technician_locations(tech_id);
CREATE INDEX idx_tech_locations_timestamp ON technician_locations(timestamp);
CREATE INDEX idx_tech_locations_job_id ON technician_locations(job_id);

-- RLS policies
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

-- Techs can insert their own location
CREATE POLICY "Techs can insert own location"
  ON technician_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tech_id);

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.business_id = (
        SELECT business_id FROM users WHERE id = tech_id
      )
    )
  );

-- Customers can see location of tech assigned to their job
CREATE POLICY "Customers can see assigned tech location"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      WHERE c.user_id = auth.uid()
    )
  );
```

#### Frontend Components

**File: `components/admin/TechLocationMap.tsx`**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'

interface TechLocation {
  tech_id: string
  tech_name: string
  latitude: number
  longitude: number
  job_id?: string
  job_address?: string
  timestamp: string
}

export default function TechLocationMap() {
  const [locations, setLocations] = useState<TechLocation[]>([])
  const [selectedTech, setSelectedTech] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial locations
    fetchLocations()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('tech-locations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'technician_locations'
      }, (payload) => {
        // Update tech location in real-time
        updateTechLocation(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchLocations() {
    // Implementation
  }

  return (
    <GoogleMap
      zoom={10}
      center={{ lat: 0, lng: 0 }}
      mapContainerClassName="w-full h-[600px] rounded-xl"
    >
      {locations.map((location) => (
        <Marker
          key={location.tech_id}
          position={{ lat: location.latitude, lng: location.longitude }}
          onClick={() => setSelectedTech(location.tech_id)}
          icon={{
            url: '/icons/tech-marker.svg',
            scaledSize: new google.maps.Size(40, 40)
          }}
        />
      ))}
    </GoogleMap>
  )
}
```

**File: `components/tech/LocationSharing.tsx`**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, MapPinOff } from 'lucide-react'

export default function LocationSharing({ techId, jobId }: { techId: string, jobId?: string }) {
  const [isSharing, setIsSharing] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const supabase = createClient()

        await supabase.from('technician_locations').insert({
          tech_id: techId,
          job_id: jobId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading
        })
      },
      (error) => console.error('Location error:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    )

    setWatchId(id)
    setIsSharing(true)
  }

  const stopSharing = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setIsSharing(false)
    }
  }

  return (
    <button
      onClick={isSharing ? stopSharing : startSharing}
      className={isSharing ? 'btn-primary' : 'btn-secondary'}
    >
      {isSharing ? (
        <>
          <MapPin className="w-4 h-4" />
          Sharing Location
        </>
      ) : (
        <>
          <MapPinOff className="w-4 h-4" />
          Start Sharing
        </>
      )}
    </button>
  )
}
```

**File: `lib/maps/eta-calculator.ts`**
```typescript
import { calculateRoute } from './google-maps'

export async function calculateETA(
  techLocation: { lat: number; lng: number },
  customerAddress: string
): Promise<{
  duration: number // in minutes
  distance: number // in meters
  arrival_time: Date
}> {
  const route = await calculateRoute(
    `${techLocation.lat},${techLocation.lng}`,
    customerAddress
  )

  const durationMinutes = Math.ceil(route.duration / 60)
  const arrivalTime = new Date(Date.now() + route.duration * 1000)

  return {
    duration: durationMinutes,
    distance: route.distance,
    arrival_time: arrivalTime
  }
}
```

#### API Routes

**File: `app/api/tracking/location/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { latitude, longitude, job_id, accuracy, speed, heading } = await request.json()

  const { error } = await supabase.from('technician_locations').insert({
    tech_id: user.id,
    job_id,
    latitude,
    longitude,
    accuracy,
    speed,
    heading
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const tech_id = searchParams.get('tech_id')

  // Get latest location for tech(s)
  const query = supabase
    .from('technician_locations')
    .select(`
      *,
      user:users(full_name, phone),
      job:jobs(id, address, customer_id)
    `)
    .order('timestamp', { ascending: false })

  if (tech_id) {
    query.eq('tech_id', tech_id).limit(1)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

#### Environment Variables
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Testing Requirements
- [ ] Tech can enable location sharing
- [ ] Admin sees tech location on map
- [ ] Customer sees assigned tech location
- [ ] ETA calculates correctly with traffic
- [ ] Real-time updates work (< 30s delay)
- [ ] Location stops sharing when job completed
- [ ] Battery usage is reasonable (< 5% per hour)
- [ ] Works on iOS and Android browsers

### Acceptance Criteria
- ✅ Tech location updates every 30 seconds
- ✅ ETA accuracy within 5 minutes
- ✅ Map shows all active techs
- ✅ Customer can see tech approaching
- ✅ Automatic "tech is nearby" notification at 10 min ETA

### Dependencies
- Google Maps JavaScript API
- Geolocation API (browser)
- Supabase Realtime

### Time Estimate
**3-4 hours**
- Database schema: 30 min
- Backend API: 1 hour
- Frontend components: 1.5-2 hours
- Testing: 30-60 min

---

## 2. Route Optimization

### Overview
Optimize technician routes for multiple jobs to reduce drive time and increase jobs per day.

### User Stories
- **As an admin**, I want to see the optimal order for a tech's jobs, so we minimize drive time
- **As a tech**, I want my daily route optimized, so I can complete more jobs
- **As a business owner**, I want to reduce fuel costs and increase productivity

### Technical Requirements

#### Database Schema
```sql
-- Add route optimization fields to jobs table
ALTER TABLE jobs ADD COLUMN optimized_sequence INTEGER;
ALTER TABLE jobs ADD COLUMN estimated_drive_time INTEGER; -- in minutes
ALTER TABLE jobs ADD COLUMN route_id UUID;

-- Create routes table
CREATE TABLE optimized_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tech_id UUID REFERENCES users(id) NOT NULL,
  date DATE NOT NULL,
  total_distance DECIMAL(10, 2), -- in meters
  total_drive_time INTEGER, -- in minutes
  jobs_count INTEGER,
  optimized_order JSONB, -- Array of job IDs in order
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_routes_tech_date ON optimized_routes(tech_id, date);
```

#### Backend Service

**File: `lib/routing/optimizer.ts`**
```typescript
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client({})

export interface RouteWaypoint {
  job_id: string
  address: string
  latitude?: number
  longitude?: number
  duration_minutes: number // estimated job duration
  priority: 'low' | 'normal' | 'high' | 'urgent'
  time_window?: {
    start: string // "09:00"
    end: string // "17:00"
  }
}

export interface OptimizedRoute {
  total_distance: number // meters
  total_drive_time: number // minutes
  total_job_time: number // minutes
  waypoints: Array<{
    job_id: string
    sequence: number
    arrival_time: string
    departure_time: string
    drive_time_from_previous: number
  }>
}

/**
 * Optimize route using Google Maps Directions API
 */
export async function optimizeRoute(
  startLocation: string, // Tech's starting location
  waypoints: RouteWaypoint[],
  startTime: Date = new Date()
): Promise<OptimizedRoute> {

  // Sort by priority first
  const prioritySorted = [...waypoints].sort((a, b) => {
    const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 }
    return priorityWeight[b.priority] - priorityWeight[a.priority]
  })

  // Use Google Maps Directions API with waypoint optimization
  const response = await client.directions({
    params: {
      origin: startLocation,
      destination: startLocation, // Return to start
      waypoints: prioritySorted.map(w => ({
        location: w.address,
        stopover: true
      })),
      optimize: true, // Let Google optimize the order
      departure_time: startTime,
      traffic_model: 'best_guess',
      key: process.env.GOOGLE_MAPS_API_KEY!
    }
  })

  const route = response.data.routes[0]
  const optimizedOrder = route.waypoint_order

  // Build optimized route with timings
  let currentTime = startTime
  const optimizedWaypoints = []

  for (let i = 0; i < optimizedOrder.length; i++) {
    const waypointIndex = optimizedOrder[i]
    const waypoint = prioritySorted[waypointIndex]
    const leg = route.legs[i]

    const driveTime = Math.ceil(leg.duration.value / 60) // Convert to minutes
    const arrivalTime = new Date(currentTime.getTime() + driveTime * 60000)
    const departureTime = new Date(arrivalTime.getTime() + waypoint.duration_minutes * 60000)

    optimizedWaypoints.push({
      job_id: waypoint.job_id,
      sequence: i + 1,
      arrival_time: arrivalTime.toISOString(),
      departure_time: departureTime.toISOString(),
      drive_time_from_previous: driveTime
    })

    currentTime = departureTime
  }

  return {
    total_distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
    total_drive_time: route.legs.reduce((sum, leg) => sum + Math.ceil(leg.duration.value / 60), 0),
    total_job_time: waypoints.reduce((sum, w) => sum + w.duration_minutes, 0),
    waypoints: optimizedWaypoints
  }
}

/**
 * Alternative: Use MapBox Optimization API
 * (More cost-effective for high volume)
 */
export async function optimizeRouteMapBox(
  startLocation: string,
  waypoints: RouteWaypoint[]
): Promise<OptimizedRoute> {
  // Implementation using MapBox Optimization API
  // https://docs.mapbox.com/api/navigation/optimization/
}
```

**File: `app/api/routes/optimize/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { optimizeRoute } from '@/lib/routing/optimizer'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { tech_id, date } = await request.json()

  // Get tech's jobs for the day
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, address, scheduled_start, estimated_duration, urgency, customer:customers(address)')
    .eq('tech_id', tech_id)
    .gte('scheduled_start', `${date}T00:00:00`)
    .lt('scheduled_start', `${date}T23:59:59`)
    .eq('status', 'scheduled')

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: 'No jobs to optimize' })
  }

  // Get tech's starting location (home or first job)
  const { data: tech } = await supabase
    .from('users')
    .select('address')
    .eq('id', tech_id)
    .single()

  const waypoints = jobs.map(job => ({
    job_id: job.id,
    address: job.address,
    duration_minutes: job.estimated_duration || 60,
    priority: job.urgency || 'normal'
  }))

  // Optimize route
  const optimizedRoute = await optimizeRoute(
    tech.address || jobs[0].address,
    waypoints,
    new Date(`${date}T08:00:00`)
  )

  // Save optimized route
  const { data: savedRoute } = await supabase
    .from('optimized_routes')
    .insert({
      tech_id,
      date,
      total_distance: optimizedRoute.total_distance,
      total_drive_time: optimizedRoute.total_drive_time,
      jobs_count: jobs.length,
      optimized_order: optimizedRoute.waypoints.map(w => w.job_id)
    })
    .select()
    .single()

  // Update jobs with sequence
  for (const waypoint of optimizedRoute.waypoints) {
    await supabase
      .from('jobs')
      .update({
        optimized_sequence: waypoint.sequence,
        estimated_drive_time: waypoint.drive_time_from_previous,
        route_id: savedRoute.id,
        scheduled_start: waypoint.arrival_time
      })
      .eq('id', waypoint.job_id)
  }

  return NextResponse.json({
    route: savedRoute,
    details: optimizedRoute
  })
}
```

#### Frontend Components

**File: `components/admin/RouteOptimizer.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { Route, MapPin, Clock, Fuel } from 'lucide-react'
import { showToast } from '@/lib/utils/toast'

export default function RouteOptimizer({ techId, date }: { techId: string, date: string }) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedRoute, setOptimizedRoute] = useState(null)

  const handleOptimize = async () => {
    setIsOptimizing(true)
    try {
      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tech_id: techId, date })
      })

      const data = await response.json()
      setOptimizedRoute(data)
      showToast.success('Route optimized successfully!')
    } catch (error) {
      showToast.error('Failed to optimize route')
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Route Optimization</h3>

      <button
        onClick={handleOptimize}
        disabled={isOptimizing}
        className="btn-primary mb-4"
      >
        <Route className="w-4 h-4" />
        {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
      </button>

      {optimizedRoute && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <div className="text-xs text-muted">Distance</div>
                <div className="font-semibold">
                  {(optimizedRoute.details.total_distance / 1609.34).toFixed(1)} mi
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <div className="text-xs text-muted">Drive Time</div>
                <div className="font-semibold">
                  {optimizedRoute.details.total_drive_time} min
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-success" />
              <div>
                <div className="text-xs text-muted">Fuel Saved</div>
                <div className="font-semibold text-success">
                  ~{Math.round(optimizedRoute.details.total_distance / 1609.34 * 0.15)} gal
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Optimized Sequence</h4>
            <div className="space-y-2">
              {optimizedRoute.details.waypoints.map((waypoint, index) => (
                <div key={waypoint.job_id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Job #{waypoint.job_id.slice(0, 8)}</div>
                    <div className="text-xs text-muted">
                      ETA: {new Date(waypoint.arrival_time).toLocaleTimeString()}
                      {waypoint.drive_time_from_previous > 0 && ` (+${waypoint.drive_time_from_previous} min drive)`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Testing Requirements
- [ ] Routes optimize correctly for 2-10 jobs
- [ ] Urgent jobs prioritized over normal
- [ ] Time windows respected
- [ ] Total drive time accurate (±10%)
- [ ] Works with traffic data
- [ ] Handles failed geocoding gracefully

### Acceptance Criteria
- ✅ Reduces drive time by 15-30%
- ✅ Optimizes in < 5 seconds for 10 jobs
- ✅ Respects job priorities and time windows
- ✅ Shows estimated fuel savings
- ✅ Updates job schedule with optimized times

### Dependencies
- Google Maps Directions API (or MapBox)
- Google Maps Geocoding API

### Time Estimate
**4-6 hours**
- Routing algorithm: 2 hours
- Backend API: 1 hour
- Frontend UI: 1.5-2 hours
- Testing: 30-60 min

---

## 3. Dispatch Board

### Overview
Visual drag-and-drop scheduling board for assigning and rescheduling jobs across technicians.

### User Stories
- **As a dispatcher**, I want to drag jobs between techs, so I can quickly reassign work
- **As an admin**, I want to see all techs and jobs in one view, so I can balance workload
- **As a manager**, I want color-coded job statuses, so I can spot problems quickly

### Technical Requirements

#### Frontend Components

**File: `components/admin/DispatchBoard.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { format } from 'date-fns'
import TechColumn from './dispatch/TechColumn'
import JobCard from './dispatch/JobCard'

interface Job {
  id: string
  customer_name: string
  address: string
  scheduled_start: string
  scheduled_end: string
  status: string
  urgency: string
  tech_id: string | null
}

export default function DispatchBoard({ date }: { date: string }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [techs, setTechs] = useState([])
  const [activeJob, setActiveJob] = useState<Job | null>(null)

  useEffect(() => {
    fetchJobs()
    fetchTechs()
  }, [date])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const jobId = active.id as string
    const newTechId = over.id as string

    // Update job assignment
    await fetch('/api/jobs/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, tech_id: newTechId })
    })

    // Optimistically update UI
    setJobs(jobs.map(job =>
      job.id === jobId ? { ...job, tech_id: newTechId } : job
    ))
  }

  // Group jobs by tech
  const jobsByTech = techs.reduce((acc, tech) => {
    acc[tech.id] = jobs.filter(job => job.tech_id === tech.id)
    return acc
  }, {})

  const unassignedJobs = jobs.filter(job => !job.tech_id)

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={(event) => {
        const job = jobs.find(j => j.id === event.active.id)
        setActiveJob(job || null)
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned column */}
        <TechColumn
          id="unassigned"
          name="Unassigned"
          jobs={unassignedJobs}
          color="gray"
        />

        {/* Tech columns */}
        {techs.map(tech => (
          <TechColumn
            key={tech.id}
            id={tech.id}
            name={tech.full_name}
            jobs={jobsByTech[tech.id] || []}
            avatar={tech.avatar_url}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob && <JobCard job={activeJob} />}
      </DragOverlay>
    </DndContext>
  )
}
```

**File: `components/admin/dispatch/TechColumn.tsx`**
```typescript
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import DraggableJobCard from './DraggableJobCard'

export default function TechColumn({ id, name, jobs, avatar, color = 'primary' }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const totalDuration = jobs.reduce((sum, job) => {
    const start = new Date(job.scheduled_start)
    const end = new Date(job.scheduled_end)
    return sum + (end.getTime() - start.getTime()) / 60000
  }, 0)

  return (
    <div
      ref={setNodeRef}
      className={`
        w-80 flex-shrink-0 glass-card p-4
        ${isOver ? 'ring-2 ring-primary' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {avatar ? (
          <img src={avatar} alt={name} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            {name[0]}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold">{name}</h3>
          <p className="text-xs text-muted">
            {jobs.length} jobs · {Math.round(totalDuration / 60)}h {totalDuration % 60}m
          </p>
        </div>
      </div>

      {/* Jobs */}
      <SortableContext
        items={jobs.map(j => j.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {jobs.map(job => (
            <DraggableJobCard key={job.id} job={job} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
```

**File: `components/admin/dispatch/DraggableJobCard.tsx`**
```typescript
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, MapPin, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function DraggableJobCard({ job }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const urgencyColors = {
    low: 'border-l-gray-400',
    normal: 'border-l-blue-500',
    high: 'border-l-orange-500',
    urgent: 'border-l-red-500'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4
        ${urgencyColors[job.urgency || 'normal']}
        cursor-move hover:shadow-md transition
      `}
    >
      <div className="font-medium text-sm mb-1">{job.customer_name}</div>

      <div className="flex items-center gap-2 text-xs text-muted mb-2">
        <Clock className="w-3 h-3" />
        {format(new Date(job.scheduled_start), 'h:mm a')}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        <MapPin className="w-3 h-3" />
        <span className="truncate">{job.address}</span>
      </div>

      {job.urgency === 'urgent' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          Urgent
        </div>
      )}
    </div>
  )
}
```

**File: `app/admin/dispatch/page.tsx`**
```typescript
import { createClient } from '@/lib/supabase/server'
import DispatchBoard from '@/components/admin/DispatchBoard'
import { format } from 'date-fns'

export default async function DispatchPage({ searchParams }: { searchParams: { date?: string } }) {
  const date = searchParams.date || format(new Date(), 'yyyy-MM-dd')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dispatch Board</h1>
        <p className="text-muted">Drag and drop to assign jobs to technicians</p>
      </div>

      <DispatchBoard date={date} />
    </div>
  )
}
```

### Package Dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Testing Requirements
- [ ] Can drag jobs between techs
- [ ] Can drag jobs to unassigned
- [ ] Job assignment updates in database
- [ ] Real-time updates for other users
- [ ] Color coding by urgency works
- [ ] Workload calculation correct
- [ ] Mobile responsive (fallback to list view)

### Acceptance Criteria
- ✅ Drag-and-drop works smoothly
- ✅ Shows all techs and jobs for selected day
- ✅ Color-coded by urgency/status
- ✅ Updates persist to database
- ✅ Mobile fallback available

### Dependencies
- @dnd-kit/core (drag-and-drop)
- Supabase realtime (live updates)

### Time Estimate
**6-8 hours**
- DnD setup: 2 hours
- Components: 2-3 hours
- Backend integration: 1-2 hours
- Testing & polish: 1-2 hours

---

## 4. Multiple Calendar Views

### Overview
Add Week, Day, and Map views to complement existing Month view.

### User Stories
- **As an admin**, I want to see jobs by week, so I can plan capacity
- **As a dispatcher**, I want to see today's jobs in hourly detail
- **As a manager**, I want to see all jobs on a map, so I can optimize territories

### Technical Requirements

#### Frontend Components

**File: `components/admin/calendar/CalendarViewSwitcher.tsx`**
```typescript
'use client'

import { Calendar, List, Map, LayoutGrid } from 'lucide-react'

export default function CalendarViewSwitcher({ view, onChange }) {
  const views = [
    { id: 'month', label: 'Month', icon: Calendar },
    { id: 'week', label: 'Week', icon: LayoutGrid },
    { id: 'day', label: 'Day', icon: List },
    { id: 'map', label: 'Map', icon: Map }
  ]

  return (
    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      {views.map(v => {
        const Icon = v.icon
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={`
              px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition
              ${view === v.id
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
```

**File: `components/admin/calendar/WeekView.tsx`**
```typescript
'use client'

import { startOfWeek, addDays, format, isSameDay } from 'date-fns'

export default function WeekView({ date, jobs }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8am - 8pm

  const getJobsForSlot = (day, hour) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.scheduled_start)
      return isSameDay(jobDate, day) && jobDate.getHours() === hour
    })
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="grid grid-cols-8 gap-px bg-gray-200">
          <div className="p-2 bg-white dark:bg-gray-900" />
          {days.map(day => (
            <div key={day.toString()} className="p-2 bg-white dark:bg-gray-900 text-center">
              <div className="text-sm font-semibold">{format(day, 'EEE')}</div>
              <div className="text-2xl">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 gap-px bg-gray-200">
            <div className="p-2 bg-white dark:bg-gray-900 text-right text-sm text-muted">
              {format(new Date().setHours(hour, 0), 'h a')}
            </div>
            {days.map(day => {
              const slotJobs = getJobsForSlot(day, hour)
              return (
                <div key={day.toString()} className="p-1 bg-white dark:bg-gray-900 min-h-[60px]">
                  {slotJobs.map(job => (
                    <div
                      key={job.id}
                      className="text-xs p-1 mb-1 bg-primary/10 border-l-2 border-primary rounded"
                    >
                      <div className="font-medium truncate">{job.customer_name}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**File: `components/admin/calendar/DayView.tsx`**
```typescript
'use client'

import { format, isSameHour } from 'date-fns'

export default function DayView({ date, jobs }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7am - 9pm

  const getJobsForHour = (hour) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.scheduled_start)
      return isSameHour(jobDate, new Date(date).setHours(hour, 0))
    })
  }

  return (
    <div className="space-y-px">
      {hours.map(hour => {
        const hourJobs = getJobsForHour(hour)

        return (
          <div key={hour} className="flex gap-4">
            <div className="w-20 text-right text-sm text-muted pt-2">
              {format(new Date().setHours(hour, 0), 'h:mm a')}
            </div>

            <div className="flex-1 border-l-2 border-gray-200 pl-4 py-2 min-h-[80px]">
              {hourJobs.length === 0 ? (
                <div className="text-sm text-muted italic">No jobs scheduled</div>
              ) : (
                <div className="space-y-2">
                  {hourJobs.map(job => (
                    <div key={job.id} className="card p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold">{job.customer_name}</div>
                          <div className="text-sm text-muted">{job.address}</div>
                        </div>
                        <div className="text-sm">
                          {format(new Date(job.scheduled_start), 'h:mm a')} -
                          {format(new Date(job.scheduled_end), 'h:mm a')}
                        </div>
                      </div>
                      <div className="text-sm">{job.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

**File: `components/admin/calendar/MapView.tsx`**
```typescript
'use client'

import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { useState } from 'react'

export default function MapView({ jobs }) {
  const [selectedJob, setSelectedJob] = useState(null)

  const center = {
    lat: jobs[0]?.latitude || 0,
    lng: jobs[0]?.longitude || 0
  }

  return (
    <GoogleMap
      zoom={11}
      center={center}
      mapContainerClassName="w-full h-[600px] rounded-xl"
    >
      {jobs.map(job => (
        <Marker
          key={job.id}
          position={{ lat: job.latitude, lng: job.longitude }}
          onClick={() => setSelectedJob(job)}
          label={{
            text: job.customer_name[0],
            color: 'white'
          }}
        />
      ))}

      {selectedJob && (
        <InfoWindow
          position={{ lat: selectedJob.latitude, lng: selectedJob.longitude }}
          onCloseClick={() => setSelectedJob(null)}
        >
          <div className="p-2">
            <h3 className="font-semibold">{selectedJob.customer_name}</h3>
            <p className="text-sm">{selectedJob.address}</p>
            <p className="text-xs text-muted mt-1">
              {format(new Date(selectedJob.scheduled_start), 'MMM d, h:mm a')}
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}
```

### Testing Requirements
- [ ] Week view shows correct days
- [ ] Day view shows hourly breakdown
- [ ] Map view shows all jobs
- [ ] Switching views preserves selected date
- [ ] Mobile responsive

### Acceptance Criteria
- ✅ 4 total views: Month, Week, Day, Map
- ✅ Views sync selected date
- ✅ Jobs display correctly in each view
- ✅ Click job to view details
- ✅ Performance good with 100+ jobs

### Time Estimate
**2-3 hours**
- Week view: 45 min
- Day view: 45 min
- Map view: 30 min
- View switcher: 15 min
- Testing: 30 min

---

## 5. QuickBooks Integration

### Overview
Two-way sync of invoices and payments with QuickBooks Online.

### User Stories
- **As an accountant**, I want invoices auto-synced to QuickBooks, so I don't enter them twice
- **As a business owner**, I want payments to sync automatically, so my books are always current
- **As an admin**, I want to reconcile payments easily

### Technical Requirements

#### Setup

1. **Create QuickBooks Developer Account**
   - https://developer.intuit.com/
   - Create app and get credentials

2. **OAuth 2.0 Flow**
   - Implement OAuth connection
   - Store refresh tokens securely

#### Database Schema

```sql
-- QuickBooks integration table
CREATE TABLE quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) UNIQUE NOT NULL,
  realm_id TEXT NOT NULL, -- QuickBooks company ID
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync mapping table
CREATE TABLE quickbooks_sync_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  local_entity_type TEXT NOT NULL, -- 'invoice', 'customer', 'payment'
  local_entity_id UUID NOT NULL,
  qb_entity_type TEXT NOT NULL, -- 'Invoice', 'Customer', 'Payment'
  qb_entity_id TEXT NOT NULL,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_qb_sync_local ON quickbooks_sync_map(local_entity_type, local_entity_id);
CREATE INDEX idx_qb_sync_qb ON quickbooks_sync_map(qb_entity_type, qb_entity_id);
```

#### Backend Service

**File: `lib/quickbooks/client.ts`**
```typescript
import OAuthClient from 'intuit-oauth'

const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/quickbooks/callback`
})

export class QuickBooksService {
  private realmId: string
  private accessToken: string

  constructor(realmId: string, accessToken: string) {
    this.realmId = realmId
    this.accessToken = accessToken
  }

  /**
   * Create invoice in QuickBooks
   */
  async createInvoice(invoice: any) {
    const qbInvoice = {
      Line: invoice.line_items.map(item => ({
        Amount: item.total / 100,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: '1' }, // Service item
          UnitPrice: item.price / 100,
          Qty: item.quantity
        },
        Description: item.description
      })),
      CustomerRef: {
        value: await this.getOrCreateCustomer(invoice.customer)
      },
      TxnDate: invoice.issue_date,
      DueDate: invoice.due_date
    }

    const response = await oauthClient.makeApiCall({
      url: `https://quickbooks.api.intuit.com/v3/company/${this.realmId}/invoice`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(qbInvoice)
    })

    return response.json()
  }

  /**
   * Create or get existing customer
   */
  async getOrCreateCustomer(customer: any) {
    // Check if customer already synced
    const { data: existing } = await supabase
      .from('quickbooks_sync_map')
      .select('qb_entity_id')
      .eq('local_entity_type', 'customer')
      .eq('local_entity_id', customer.id)
      .single()

    if (existing) return existing.qb_entity_id

    // Create new customer in QB
    const qbCustomer = {
      DisplayName: customer.name,
      PrimaryEmailAddr: { Address: customer.email },
      PrimaryPhone: { FreeFormNumber: customer.phone },
      BillAddr: {
        Line1: customer.address,
        City: customer.city,
        CountrySubDivisionCode: customer.state,
        PostalCode: customer.zip
      }
    }

    const response = await oauthClient.makeApiCall({
      url: `https://quickbooks.api.intuit.com/v3/company/${this.realmId}/customer`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(qbCustomer)
    })

    const created = await response.json()

    // Save mapping
    await supabase.from('quickbooks_sync_map').insert({
      local_entity_type: 'customer',
      local_entity_id: customer.id,
      qb_entity_type: 'Customer',
      qb_entity_id: created.Customer.Id
    })

    return created.Customer.Id
  }

  /**
   * Record payment in QuickBooks
   */
  async recordPayment(payment: any, invoiceId: string) {
    const qbPayment = {
      TotalAmt: payment.amount / 100,
      CustomerRef: {
        value: await this.getCustomerRef(payment.customer_id)
      },
      Line: [{
        Amount: payment.amount / 100,
        LinkedTxn: [{
          TxnId: invoiceId,
          TxnType: 'Invoice'
        }]
      }]
    }

    const response = await oauthClient.makeApiCall({
      url: `https://quickbooks.api.intuit.com/v3/company/${this.realmId}/payment`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(qbPayment)
    })

    return response.json()
  }
}
```

**File: `app/api/quickbooks/connect/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OAuthClient from 'intuit-oauth'

export async function GET() {
  const oauthClient = new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID!,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/quickbooks/callback`
  })

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: 'random-state-string' // Should be CSRF token in production
  })

  return NextResponse.redirect(authUri)
}
```

**File: `app/api/quickbooks/callback/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OAuthClient from 'intuit-oauth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const realmId = searchParams.get('realmId')

  if (!code || !realmId) {
    return NextResponse.json({ error: 'Invalid callback' }, { status: 400 })
  }

  const oauthClient = new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID!,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/quickbooks/callback`
  })

  // Exchange code for tokens
  const authResponse = await oauthClient.createToken(code)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  // Save connection
  await supabase.from('quickbooks_connections').upsert({
    business_id: profile.business_id,
    realm_id: realmId,
    access_token: authResponse.access_token,
    refresh_token: authResponse.refresh_token,
    access_token_expires_at: new Date(Date.now() + authResponse.expires_in * 1000),
    refresh_token_expires_at: new Date(Date.now() + authResponse.x_refresh_token_expires_in * 1000),
    is_active: true
  })

  return NextResponse.redirect('/admin/settings?qb=connected')
}
```

**File: `app/api/quickbooks/sync/invoice/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { QuickBooksService } from '@/lib/quickbooks/client'

export async function POST(request: Request) {
  const { invoice_id } = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      line_items:invoice_line_items(*)
    `)
    .eq('id', invoice_id)
    .single()

  // Get QB connection
  const { data: connection } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('business_id', invoice.business_id)
    .eq('is_active', true)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 })
  }

  // Sync to QB
  const qbService = new QuickBooksService(connection.realm_id, connection.access_token)
  const qbInvoice = await qbService.createInvoice(invoice)

  // Save mapping
  await supabase.from('quickbooks_sync_map').insert({
    business_id: invoice.business_id,
    local_entity_type: 'invoice',
    local_entity_id: invoice.id,
    qb_entity_type: 'Invoice',
    qb_entity_id: qbInvoice.Invoice.Id,
    sync_status: 'synced'
  })

  return NextResponse.json({ success: true, qb_id: qbInvoice.Invoice.Id })
}
```

#### Frontend Components

**File: `components/admin/settings/QuickBooksConnect.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { CheckCircle, RefreshCw } from 'lucide-react'

export default function QuickBooksConnect({ isConnected, lastSynced }) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleConnect = () => {
    window.location.href = '/api/quickbooks/connect'
  }

  const handleSync = async () => {
    setIsSyncing(true)
    // Trigger full sync
    await fetch('/api/quickbooks/sync/all', { method: 'POST' })
    setIsSyncing(false)
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-4">QuickBooks Integration</h3>
        <p className="text-muted mb-4">
          Connect to QuickBooks Online to automatically sync invoices and payments.
        </p>
        <button onClick={handleConnect} className="btn-primary">
          Connect to QuickBooks
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            QuickBooks Connected
          </h3>
          {lastSynced && (
            <p className="text-sm text-muted">
              Last synced: {new Date(lastSynced).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  )
}
```

#### Package Dependencies
```bash
npm install intuit-oauth
```

#### Environment Variables
```env
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
```

### Testing Requirements
- [ ] OAuth connection flow works
- [ ] Invoices sync to QuickBooks
- [ ] Payments record correctly
- [ ] Customers don't duplicate
- [ ] Token refresh works
- [ ] Error handling for QB outages

### Acceptance Criteria
- ✅ One-click QuickBooks connection
- ✅ Auto-sync invoices when created/sent
- ✅ Auto-sync payments when received
- ✅ Shows sync status and last sync time
- ✅ Manual "Sync Now" button

### Time Estimate
**6-8 hours**
- OAuth setup: 2 hours
- Sync logic: 2-3 hours
- UI components: 1-2 hours
- Testing: 1-2 hours

---

## 6. Offline Mode for Mobile

### Overview
Enable technicians to work offline with automatic sync when connection returns.

### User Stories
- **As a tech**, I want to view jobs when offline, so I can work in areas with poor signal
- **As a tech**, I want to update job status offline, so my changes sync later
- **As a tech**, I want to upload photos offline, so I don't lose data

### Technical Requirements

#### Service Worker

**File: `public/sw.js`**
```javascript
const CACHE_NAME = 'blue-collar-bot-v1'
const urlsToCache = [
  '/',
  '/tech/today',
  '/tech/dashboard',
  '/offline',
  // Add critical assets
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch
      return response || fetch(event.request)
    })
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-jobs') {
    event.waitUntil(syncJobs())
  }
})

async function syncJobs() {
  // Get pending updates from IndexedDB
  const db = await openDB()
  const pending = await db.getAll('pending')

  for (const update of pending) {
    try {
      await fetch('/api/jobs/update-status', {
        method: 'POST',
        body: JSON.stringify(update)
      })
      await db.delete('pending', update.id)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }
}
```

#### IndexedDB Storage

**File: `lib/offline/db.ts`**
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface OfflineDB extends DBSchema {
  jobs: {
    key: string
    value: {
      id: string
      data: any
      synced: boolean
      updated_at: string
    }
  }
  pending: {
    key: string
    value: {
      id: string
      type: 'status_update' | 'photo_upload' | 'note_add'
      data: any
      created_at: string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>>

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('blue-collar-bot', 1, {
      upgrade(db) {
        db.createObjectStore('jobs', { keyPath: 'id' })
        db.createObjectStore('pending', { keyPath: 'id' })
      }
    })
  }
  return dbPromise
}

export async function cacheJob(job: any) {
  const db = await getDB()
  await db.put('jobs', {
    id: job.id,
    data: job,
    synced: true,
    updated_at: new Date().toISOString()
  })
}

export async function getCachedJob(jobId: string) {
  const db = await getDB()
  const cached = await db.get('jobs', jobId)
  return cached?.data
}

export async function queueUpdate(type: string, data: any) {
  const db = await getDB()
  await db.add('pending', {
    id: crypto.randomUUID(),
    type,
    data,
    created_at: new Date().toISOString()
  })

  // Request background sync
  if ('serviceWorker' in navigator && 'sync' in registration) {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('sync-jobs')
  }
}
```

#### Offline Detection

**File: `hooks/useOnlineStatus.ts`**
```typescript
'use client'

import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

#### Offline UI Components

**File: `components/tech/OfflineBanner.tsx`**
```typescript
'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-5 h-5" />
        <span className="font-medium">You're offline</span>
      </div>
      <div className="text-sm">
        Changes will sync when connection returns
      </div>
    </div>
  )
}
```

**File: `components/tech/JobStatusUpdate.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { queueUpdate } from '@/lib/offline/db'
import { showToast } from '@/lib/utils/toast'

export default function JobStatusUpdate({ jobId, currentStatus }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const isOnline = useOnlineStatus()

  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true)

    try {
      if (isOnline) {
        // Update immediately
        await fetch('/api/jobs/update-status', {
          method: 'POST',
          body: JSON.stringify({ job_id: jobId, status: newStatus })
        })
        showToast.success('Status updated')
      } else {
        // Queue for later
        await queueUpdate('status_update', { job_id: jobId, status: newStatus })
        showToast.success('Status queued (offline)', {
          icon: '📡',
          description: 'Will sync when online'
        })
      }
    } catch (error) {
      showToast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    // Status update UI
  )
}
```

#### Package Dependencies
```bash
npm install idb workbox-precaching workbox-routing
```

### Testing Requirements
- [ ] App loads when offline
- [ ] Cached jobs display correctly
- [ ] Status updates queue when offline
- [ ] Sync happens automatically when online
- [ ] Photos queue for upload
- [ ] No data loss during offline period

### Acceptance Criteria
- ✅ Tech can view assigned jobs offline
- ✅ Tech can update status offline (queued)
- ✅ Changes sync automatically when online
- ✅ Offline banner shows when disconnected
- ✅ Works on iOS and Android

### Time Estimate
**8-10 hours**
- Service worker setup: 2 hours
- IndexedDB implementation: 2-3 hours
- Offline UI: 2 hours
- Sync logic: 2-3 hours
- Testing: 2 hours

---

## 7. Advanced Analytics Dashboard

### Overview
Predictive analytics and advanced business insights.

### Features
- Revenue forecasting
- Technician performance trends
- Customer lifetime value
- Job completion rates
- Profitability by service type

### Time Estimate
**8-10 hours**

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Admin   │  │   Tech   │  │ Customer │              │
│  │Dashboard │  │  Mobile  │  │  Portal  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│        │              │              │                   │
└────────┼──────────────┼──────────────┼──────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              API Routes (Next.js /app/api)               │
│                                                          │
│  /jobs  /tracking  /routes  /quickbooks  /webhooks      │
└─────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                   Services Layer                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Routing  │  │ QuickBooks│  │  Stripe  │              │
│  │  (GMaps) │  │  Service  │  │  Client  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)                   │
│                                                          │
│  Jobs │ Locations │ Routes │ QuickBooks │ Customers     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Examples

**GPS Tracking:**
```
Tech Device (Geolocation API)
  ↓ POST /api/tracking/location
API Route
  ↓ INSERT technician_locations
Supabase PostgreSQL
  ↓ Realtime subscription
Admin Dashboard (Live Map)
  ↓ Customer Portal (ETA display)
```

**Route Optimization:**
```
Admin clicks "Optimize Route"
  ↓ POST /api/routes/optimize
Fetch jobs from Supabase
  ↓ Call Google Maps Directions API
Calculate optimal order
  ↓ Update jobs with sequence
Display optimized route
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React, TypeScript | UI framework |
| **Styling** | TailwindCSS | Styling |
| **State** | React Hooks, URL Params | State management |
| **Database** | PostgreSQL (Supabase) | Data storage |
| **Auth** | Supabase Auth | Authentication |
| **Realtime** | Supabase Realtime | Live updates |
| **Maps** | Google Maps API | GPS, routing, geocoding |
| **Accounting** | QuickBooks Online API | Invoice sync |
| **Payments** | Stripe | Payment processing |
| **Email** | Resend | Notifications |
| **SMS** | Twilio | Text notifications |
| **Offline** | Service Workers, IndexedDB | Offline support |
| **Deployment** | Vercel | Hosting |

### External APIs

| Service | API | Monthly Cost | Usage |
|---------|-----|--------------|-------|
| Google Maps | Directions, Geocoding, Maps JS | ~$50-200 | GPS, routing, maps |
| QuickBooks | OAuth 2.0, REST API | Free | Invoice sync |
| Stripe | Payment Intents, Webhooks | 2.9% + $0.30 | Payments |
| Resend | Email API | $20 | Email notifications |
| Twilio | SMS API | ~$20 | Text notifications |

---

## Testing Strategy

### Unit Tests

**Tools:** Jest, React Testing Library

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Test Files:**
- `lib/routing/__tests__/optimizer.test.ts`
- `components/admin/__tests__/DispatchBoard.test.tsx`
- `lib/quickbooks/__tests__/client.test.ts`

**Example Test:**
```typescript
// lib/routing/__tests__/optimizer.test.ts
import { optimizeRoute } from '../optimizer'

describe('Route Optimizer', () => {
  it('should optimize route for multiple waypoints', async () => {
    const waypoints = [
      { job_id: '1', address: '123 Main St', duration_minutes: 60, priority: 'normal' },
      { job_id: '2', address: '456 Oak Ave', duration_minutes: 45, priority: 'high' }
    ]

    const result = await optimizeRoute('789 Start St', waypoints)

    expect(result.waypoints).toHaveLength(2)
    expect(result.waypoints[0].sequence).toBe(1)
    expect(result.total_drive_time).toBeGreaterThan(0)
  })
})
```

### Integration Tests

**Tools:** Playwright

```bash
npm install --save-dev @playwright/test
```

**Test Scenarios:**
- GPS tracking flow (tech → admin → customer)
- Route optimization end-to-end
- Drag-and-drop dispatch board
- QuickBooks OAuth connection
- Offline mode data sync

### Manual Testing Checklist

#### GPS Tracking
- [ ] Tech can enable location sharing
- [ ] Admin sees tech on map
- [ ] Customer sees tech location and ETA
- [ ] Location updates in real-time (< 30s)
- [ ] Battery usage reasonable

#### Route Optimization
- [ ] Routes optimize correctly
- [ ] Urgent jobs prioritized
- [ ] Drive time accurate
- [ ] Works with 2-10 jobs
- [ ] Handles errors gracefully

#### Dispatch Board
- [ ] Can drag jobs between techs
- [ ] Updates persist to database
- [ ] Real-time updates work
- [ ] Color coding correct
- [ ] Mobile fallback works

#### QuickBooks
- [ ] OAuth connection works
- [ ] Invoices sync correctly
- [ ] Payments record properly
- [ ] Customers don't duplicate
- [ ] Token refresh works

#### Offline Mode
- [ ] App loads when offline
- [ ] Can view cached jobs
- [ ] Updates queue correctly
- [ ] Sync works when online
- [ ] No data loss

---

## Deployment Plan

### Pre-Deployment Checklist

#### Environment Variables
```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# New
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_API_KEY= # Server-side key
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
```

#### Database Migrations

Run all new migrations in order:
1. `010_gps_tracking.sql`
2. `011_route_optimization.sql`
3. `012_quickbooks_integration.sql`

#### Google Maps API Setup
1. Create project in Google Cloud Console
2. Enable APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
   - Places API (optional)
3. Create API keys (separate for client/server)
4. Set billing limits ($200/month)

#### QuickBooks Setup
1. Create app at developer.intuit.com
2. Get client ID and secret
3. Set redirect URI: `https://yourdomain.com/api/quickbooks/callback`
4. Request production credentials

### Phase 1 Deployment (GPS + Routes + Dispatch)

**Week 1:**
1. Deploy GPS tracking
2. Test with 2-3 pilot techs
3. Monitor battery usage
4. Fix bugs

**Week 2:**
1. Deploy route optimization
2. Run A/B test (optimized vs manual)
3. Measure drive time savings
4. Deploy dispatch board
5. Train dispatchers

### Phase 2 Deployment (Calendar + QuickBooks)

**Week 3:**
1. Deploy multiple calendar views
2. Gather user feedback
3. Deploy QuickBooks integration
4. Connect first 5 customers
5. Monitor sync reliability

### Phase 3 Deployment (Offline + Analytics)

**Week 4-5:**
1. Deploy offline mode (beta)
2. Test in areas with poor signal
3. Deploy advanced analytics
4. Set up monitoring alerts

### Rollback Plan

If issues arise:
1. **GPS**: Disable location sharing button
2. **Routes**: Fall back to manual scheduling
3. **Dispatch**: Revert to job list view
4. **QuickBooks**: Pause auto-sync
5. **Offline**: Disable service worker

### Monitoring

**Metrics to Track:**
- GPS update frequency and accuracy
- Route optimization savings (drive time)
- Dispatch board usage rate
- QuickBooks sync success rate
- Offline mode sync queue size
- API error rates
- Page load times

**Alerts:**
- GPS not updating > 2 minutes
- Route optimization failures > 5%
- QuickBooks sync errors
- Offline sync queue > 50 items
- API errors > 1% of requests

---

## Success Metrics

### Phase 1 Success (After 2 weeks)

| Metric | Target | Measurement |
|--------|--------|-------------|
| GPS accuracy | < 50m average | Track actual vs reported location |
| Route optimization savings | 15-30% drive time reduction | Before/after comparison |
| Dispatch board adoption | > 80% of admins using | Usage analytics |
| GPS battery impact | < 5% per hour | User feedback surveys |
| Customer ETA satisfaction | > 4.5/5 rating | In-app ratings |

### Phase 2 Success (After 4 weeks)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Calendar view usage | > 50% use non-month views | View analytics |
| QuickBooks sync reliability | > 95% success rate | Sync logs |
| Invoice sync time | < 30 seconds | Performance monitoring |
| Accounting time saved | 2+ hours/week | User surveys |

### Phase 3 Success (After 6 weeks)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Offline mode reliability | > 90% successful syncs | Sync success rate |
| Data loss incidents | 0 | Error monitoring |
| Analytics engagement | > 40% weekly active users | Usage analytics |

### Business Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Customer acquisition from ServiceTitan | 5 customers | Month 1 |
| Customer retention | > 95% | Month 3 |
| Feature parity confidence | Can demo all ST features | Month 2 |
| Sales win rate vs ST | > 30% | Month 3 |
| Customer satisfaction (NPS) | > 50 | Ongoing |

---

## Risk Management

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Google Maps API cost overrun | High | Medium | Set billing alerts at $100, $150, $200 |
| QuickBooks API rate limits | Medium | Low | Implement request queuing, batch operations |
| GPS battery drain | High | Medium | Optimize update frequency, allow manual control |
| Offline sync data loss | High | Low | Extensive testing, backup queue mechanism |
| Route optimization inaccuracy | Medium | Medium | Fall back to manual, gradual rollout |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| ServiceTitan price drop | Medium | Low | Focus on AI differentiator, UX quality |
| Feature complexity delays | High | Medium | Phased rollout, MVP approach |
| Customer adoption resistance | Medium | Medium | Excellent onboarding, training materials |
| Competitor launches AI feature | High | Low | Speed to market, better execution |

---

## Timeline Summary

### Week-by-Week Plan

**Week 1: GPS Tracking + Route Optimization**
- Mon-Tue: GPS tracking (3-4 hrs)
- Wed-Thu: Route optimization (4-6 hrs)
- Fri: Testing & deployment

**Week 2: Dispatch Board + Calendar Views**
- Mon-Wed: Dispatch board (6-8 hrs)
- Thu: Multiple calendar views (2-3 hrs)
- Fri: Testing & deployment

**Week 3: QuickBooks Integration**
- Mon-Thu: QuickBooks integration (6-8 hrs)
- Fri: Testing & deployment

**Week 4: Offline Mode (Part 1)**
- Mon-Wed: Service worker + IndexedDB (4-5 hrs)
- Thu-Fri: Offline UI (2-3 hrs)

**Week 5: Offline Mode (Part 2) + Analytics**
- Mon-Tue: Sync logic (2-3 hrs), testing
- Wed-Thu: Advanced analytics (4-5 hrs)
- Fri: Final testing & deployment

**Week 6: Polish & Marketing**
- Mon-Tue: Bug fixes, performance optimization
- Wed-Thu: Create comparison materials
- Fri: Launch marketing campaign

---

## Resource Requirements

### Development Team
- **1 Full-stack Developer** (you)
- **Time commitment:** 8-10 hours/week
- **Duration:** 6-8 weeks
- **Total effort:** 48-80 hours

### External Services Budget

**One-time:**
- Google Maps setup: $0
- QuickBooks developer account: $0

**Monthly (Production):**
- Google Maps API: $50-200 (depends on usage)
- Supabase Pro: $25
- Vercel Pro: $20
- Resend: $20
- Twilio: $20
- **Total: $135-285/month**

### Testing Devices
- iPhone (iOS testing)
- Android phone (Android testing)
- Multiple browsers (Chrome, Safari, Firefox)

---

## Communication Plan

### Stakeholder Updates

**Weekly Progress Reports:**
- Features completed this week
- Hours invested
- Blockers/challenges
- Next week's plan
- Demo video/screenshots

**Demo Schedule:**
- End of Week 1: GPS + Routes demo
- End of Week 2: Dispatch board demo
- End of Week 3: QuickBooks demo
- End of Week 5: Full platform demo

### Customer Communication

**Beta Testing:**
- Recruit 5-10 pilot customers (Week 2)
- Private beta access (Week 3)
- Feedback sessions (Weekly)
- Official launch (Week 6)

**Marketing Timeline:**
- Week 1: Create comparison page
- Week 2: Write case studies
- Week 3: Launch "ServiceTitan Alternative" landing page
- Week 4: Start content marketing (blog posts, videos)
- Week 5: Launch social media campaign
- Week 6: Press release, Product Hunt launch

---

## Next Steps

### Immediate Actions (This Week)

1. **✅ Review this plan**
   - Validate time estimates
   - Confirm priorities
   - Identify any gaps

2. **🔨 Set up Google Maps API**
   - Create Google Cloud project
   - Enable required APIs
   - Generate API keys
   - Set billing limits

3. **🔨 Start GPS Tracking**
   - Create database schema
   - Build location tracking API
   - Implement frontend map component
   - Test with personal device

4. **📝 Create comparison landing page**
   - "Blue Collar Bot vs ServiceTitan"
   - Highlight your advantages
   - Include pricing comparison

### Week 1 Deliverables

- [ ] GPS tracking fully functional
- [ ] Route optimization working
- [ ] Comparison page live
- [ ] 2 pilot customers recruited

### Decision Points

**After Week 2:**
- Continue to Phase 2 features?
- OR polish Phase 1 features first?

**After Week 3:**
- Launch beta to customers?
- OR complete all features first?

**After Week 5:**
- Official launch?
- OR extend testing period?

---

## Conclusion

This plan will take Blue Collar Bot from its current strong foundation to full competitive parity with ServiceTitan in 6-8 weeks.

### Summary

**Total Time:** 35-45 hours
**Timeline:** 6-8 weeks (8-10 hours/week)
**Investment:** ~$135-285/month for services

**After completion, you'll have:**
- ✅ GPS tracking with live tech locations
- ✅ AI-powered route optimization
- ✅ Visual drag-and-drop dispatch board
- ✅ 4 calendar views (Month, Week, Day, Map)
- ✅ QuickBooks Online integration
- ✅ Offline mode for mobile
- ✅ Advanced analytics dashboard

**Your competitive position:**
- 90%+ feature parity with ServiceTitan
- Unique AI phone receptionist advantage
- 70% lower price point
- Better UX and modern tech stack
- Faster setup and no contracts

**You'll be ready to:**
- Demo confidently against ServiceTitan
- Win customers from competitors
- Scale to 100+ customers
- Raise prices as you add value

---

**Let's build the ServiceTitan killer! 🚀**

**Ready to start? Let me know which feature you'd like to tackle first:**
1. GPS Tracking (3-4 hours)
2. Route Optimization (4-6 hours)
3. Dispatch Board (6-8 hours)
4. All of the above in sequence

Or would you like to adjust the plan first?
