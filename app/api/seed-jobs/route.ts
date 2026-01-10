import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, any>))
    const createInvoices = body?.createInvoices === true

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', profile.business_id)

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: 'No customers found. Create a customer first.' }, { status: 400 })
    }

    // Get technicians
    const { data: technicians } = await supabase
      .from('users')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('role', 'tech')

    // Get services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, base_price')
      .eq('business_id', profile.business_id)

    const totalJobs = 500
    const statusWeights = [
      { status: 'completed', weight: 0.45 },
      { status: 'scheduled', weight: 0.25 },
      { status: 'in_progress', weight: 0.1 },
      { status: 'on_the_way', weight: 0.1 },
      { status: 'arrived', weight: 0.05 },
      { status: 'cancelled', weight: 0.05 },
    ]
    const activeStatusWeights = [
      { status: 'on_the_way', weight: 0.4 },
      { status: 'arrived', weight: 0.2 },
      { status: 'in_progress', weight: 0.4 },
    ]
    const dateRangeStart = Date.UTC(2025, 11, 1, 8, 0, 0)
    const dateRangeEnd = Date.UTC(2026, 11, 31, 18, 0, 0)
    const janActiveStart = Date.UTC(2026, 0, 5, 0, 0, 0)
    const janActiveEnd = Date.UTC(2026, 0, 6, 23, 59, 59)
    const pinnedHours = [8, 10, 12, 14, 16, 18]

    const descriptions = [
      'Kitchen sink repair',
      'Water heater inspection',
      'HVAC maintenance',
      'Electrical panel check',
      'Leak detection',
      'Drain cleaning',
      'Thermostat replacement',
      'Outlet installation',
      'Toilet repair',
      'Emergency pipe repair',
    ]

    const pickWeighted = <T,>(items: Array<{ value: T; weight: number }>) => {
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
      let target = Math.random() * totalWeight
      for (const item of items) {
        if (target < item.weight) return item.value
        target -= item.weight
      }
      return items[items.length - 1].value
    }

    const randomDateInRange = () => {
      const timestamp = dateRangeStart + Math.floor(Math.random() * (dateRangeEnd - dateRangeStart))
      return new Date(timestamp)
    }

    const isJanActiveDate = (date: Date) => {
      const timestamp = date.getTime()
      return timestamp >= janActiveStart && timestamp <= janActiveEnd
    }

    const isAfterJanActiveWindow = (date: Date) => date.getTime() > janActiveEnd

    const randomMoney = (min: number, max: number) => {
      const value = min + Math.random() * (max - min)
      return Number(value.toFixed(2))
    }

    const technicianIds = technicians?.map((tech) => tech.id) || []
    const serviceIds = services?.map((service) => service.id) || []
    const defaultWeightedStatuses = statusWeights.map((item) => ({ value: item.status, weight: item.weight }))
    const activeWeightedStatuses = activeStatusWeights.map((item) => ({ value: item.status, weight: item.weight }))
    const pinnedStarts = [
      ...pinnedHours.map((hour) => new Date(Date.UTC(2026, 0, 5, hour, 0, 0))),
      ...pinnedHours.map((hour) => new Date(Date.UTC(2026, 0, 6, hour, 0, 0))),
    ]

    // Wipe existing jobs (cascades to invoices and related tables)
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('business_id', profile.business_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const jobPayloads = Array.from({ length: totalJobs }, (_, index) => {
      const scheduledStart = index < pinnedStarts.length ? pinnedStarts[index] : randomDateInRange()
      const durationHours = Math.floor(Math.random() * 4) + 1
      const scheduledEnd = new Date(scheduledStart.getTime() + durationHours * 60 * 60 * 1000)
      const status = isJanActiveDate(scheduledStart)
        ? pickWeighted(activeWeightedStatuses)
        : isAfterJanActiveWindow(scheduledStart)
          ? 'scheduled'
          : pickWeighted(defaultWeightedStatuses)
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const technician = technicianIds.length > 0 && Math.random() < 0.85
        ? technicianIds[Math.floor(Math.random() * technicianIds.length)]
        : null
      const basePrice = services && services.length > 0
        ? Number(services[Math.floor(Math.random() * services.length)].base_price || 0)
        : 0
      const totalCost = basePrice > 0 ? randomMoney(basePrice * 0.9, basePrice * 1.6) : randomMoney(85, 1200)
      const description = `${descriptions[index % descriptions.length]} #${index + 1}`

      return {
        business_id: profile.business_id,
        customer_id: customer.id,
        technician_id: technician,
        status,
        description,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        source: 'manual',
        urgency: Math.random() < 0.2 ? 'high' : Math.random() < 0.5 ? 'medium' : 'low',
        total_cost: totalCost,
      }
    })

    const insertedJobs: Array<{ id: string; customer_id: string; scheduled_start: string; total_cost: number | null }> = []
    const chunkSize = 100
    for (let i = 0; i < jobPayloads.length; i += chunkSize) {
      const batch = jobPayloads.slice(i, i + chunkSize)
      const { data: batchJobs, error: batchError } = await supabase
        .from('jobs')
        .insert(batch)
        .select('id, customer_id, scheduled_start, total_cost')

      if (batchError) {
        return NextResponse.json({ error: batchError.message }, { status: 500 })
      }

      if (batchJobs) {
        insertedJobs.push(...batchJobs)
      }
    }

    if (serviceIds.length > 0 && insertedJobs.length > 0) {
      const jobServices = insertedJobs.map((job) => ({
        job_id: job.id,
        service_id: serviceIds[Math.floor(Math.random() * serviceIds.length)],
        quantity: 1,
      }))

      for (let i = 0; i < jobServices.length; i += 200) {
        const batch = jobServices.slice(i, i + 200)
        const { error: serviceError } = await supabase
          .from('job_services')
          .insert(batch)
        if (serviceError) {
          return NextResponse.json({ error: serviceError.message }, { status: 500 })
        }
      }
    }

    let invoicesCreated = 0

    // Optional: create invoices for seeded jobs (disabled by default)
    if (createInvoices) {
      const paidCount = Math.floor(totalJobs * 0.4)
      const sentCount = Math.floor(totalJobs * 0.4)
      const draftCount = totalJobs - paidCount - sentCount
      const invoiceStatuses = [
        ...Array(paidCount).fill('paid'),
        ...Array(sentCount).fill('sent'),
        ...Array(draftCount).fill('draft'),
      ].sort(() => Math.random() - 0.5)

      const invoices = insertedJobs.map((job, index) => {
        const status = invoiceStatuses[index] || 'draft'
        const issueDate = job.scheduled_start.split('T')[0]
        const invoiceYear = issueDate.slice(0, 4)
        const dueDate = new Date(new Date(job.scheduled_start).getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
        const paidAt = status === 'paid'
          ? new Date(new Date(job.scheduled_start).getTime() + (Math.floor(Math.random() * 14) + 1) * 24 * 60 * 60 * 1000).toISOString()
          : null

        return {
          business_id: profile.business_id,
          customer_id: job.customer_id,
          job_id: job.id,
          invoice_number: `INV-${invoiceYear}-${String(index + 1).padStart(5, '0')}`,
          status,
          total: job.total_cost || 0,
          issue_date: issueDate,
          due_date: dueDate,
          paid_at: paidAt,
        }
      })

      for (let i = 0; i < invoices.length; i += 200) {
        const batch = invoices.slice(i, i + 200)
        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert(batch)
        if (invoiceError) {
          return NextResponse.json({ error: invoiceError.message }, { status: 500 })
        }
        invoicesCreated += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      message: createInvoices
        ? `Re-seeded ${insertedJobs.length} jobs and ${invoicesCreated} invoices.`
        : `Re-seeded ${insertedJobs.length} jobs. Invoices were not auto-created (createInvoices=true to enable).`,
      jobs: insertedJobs.length,
      invoices: invoicesCreated,
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
