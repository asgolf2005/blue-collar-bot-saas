import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, Clock, MapPin, Wrench, Phone, Receipt } from '@/components/ui/lucide'
import Link from 'next/link'
import LiveTrackingMap from '@/components/customer/LiveTrackingMap'
import TechnicianInfoCard from '@/components/customer/TechnicianInfoCard'
import TechnicianETA from '@/components/customer/TechnicianETA'
import JobStatusTimeline from '@/components/customer/JobStatusTimeline'
import PricingBreakdown from '@/components/customer/PricingBreakdown'
import PhotoGallery from '@/components/customer/PhotoGallery'
import AppointmentSelfServeActions from '@/components/customer/AppointmentSelfServeActions'
import JobNotes from '@/components/tech/JobNotes'

export default async function AppointmentDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    redirect('/login')
  }

  // Get job details with all related data
  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      technician:users!jobs_technician_id_fkey(*),
      media(*),
      job_services(*, service:services(*))
    `)
    .eq('id', params.id)
    .eq('customer_id', customer.id)
    .single()

  if (!job) {
    notFound()
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, phone, email')
    .eq('id', job.business_id)
    .single()

  // Get technician location if job is active
  let technicianLocation = null
  if (['on_the_way', 'arrived', 'in_progress'].includes(job.status) && job.technician_id) {
    const { data: location } = await supabase
      .from('technician_locations')
      .select('*')
      .eq('job_id', job.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    technicianLocation = location
  }

  // Get related invoice if exists
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, line_items:invoice_line_items(*)')
    .eq('job_id', job.id)
    .single()

  // Prepare services for pricing breakdown
  const services = job.job_services?.map((js: any) => ({
    name: js.service?.name || 'Service',
    price: js.service?.base_price || 0,
    quantity: js.quantity || 1
  })) || []

  // Check if job is active (for showing tracking)
  const isActiveJob = ['on_the_way', 'arrived', 'in_progress'].includes(job.status)

  // Prepare photos with type
  const photos = (job.media || []).map((m: any) => ({
    id: m.id,
    file_url: m.file_url,
    photo_type: m.photo_type || 'during',
    created_at: m.created_at
  }))

  return (
    <div className="pb-20 md:pb-0">
      {/* Back Button */}
      <Link
        href="/customer/appointments"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Appointments
      </Link>

      {/* Active Job Tracking Banner */}
      {isActiveJob && (
        <div className="mb-6">
          <TechnicianInfoCard
            technician={job.technician}
            eta={job.eta_minutes}
            status={job.status}
            lastUpdated={technicianLocation?.updated_at}
            variant="banner"
          />
        </div>
      )}

      {/* Live Tracking Map (for active jobs) */}
      {isActiveJob && job.technician && (
        <div className="mb-6">
          <LiveTrackingMap
            technicianLocation={technicianLocation}
            technician={job.technician}
            customerAddress={job.customer?.address || ''}
            eta={job.eta_minutes}
            jobStatus={job.status}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Details Card */}
          <div className="card">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
                <p className="text-gray-500 mt-1">
                  {format(new Date(job.scheduled_start), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>

            <div className="space-y-4">
              {/* Date and Time */}
              <div className="flex items-start p-4 bg-gray-50 rounded-xl">
                <div className="bg-primary-100 p-2.5 rounded-lg mr-4">
                  <Calendar className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {format(new Date(job.scheduled_start), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(new Date(job.scheduled_start), 'h:mm a')} - {format(new Date(job.scheduled_end), 'h:mm a')}
                  </div>
                </div>
              </div>

              {/* Service Description */}
              {job.description && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <Wrench className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-900">Service Description</h3>
                  </div>
                  <p className="text-gray-700">{job.description}</p>
                </div>
              )}

              {/* Service Location */}
              {job.customer?.address && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <MapPin className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-900">Service Location</h3>
                  </div>
                  <p className="text-gray-700">{job.customer.address}</p>
                </div>
              )}

              {/* Priority Badge */}
              {job.urgency && job.urgency !== 'normal' && (
                <div className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg">
                  Priority: {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
                </div>
              )}
            </div>
          </div>

          {/* Photos Section */}
          {photos.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Service Photos</h3>
              <PhotoGallery photos={photos} columns={3} />
            </div>
          )}

          {/* Job Updates/Notes */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Activity & Updates</h3>
            <JobNotes jobId={job.id} isCustomerView embedded />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <AppointmentSelfServeActions
            jobId={job.id}
            jobStatus={job.status}
            businessPhone={business?.phone || null}
            businessEmail={business?.email || null}
          />

          {job.status === 'on_the_way' && job.customer?.address && job.technician && (
            <TechnicianETA
              jobId={job.id}
              jobAddress={job.customer.address}
              techName={job.technician.full_name || 'Your technician'}
            />
          )}

          {/* Technician Card */}
          {job.technician && !isActiveJob && (
            <TechnicianInfoCard
              technician={job.technician}
              eta={null}
              status={job.status}
            />
          )}

          {/* Status Timeline */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Job Progress</h3>
            <JobStatusTimeline
              currentStatus={job.status}
              scheduledStart={job.scheduled_start}
              variant="vertical"
            />
          </div>

          {/* Pricing Breakdown */}
          {(job.total_cost || job.labor_hours || job.parts_cost || services.length > 0) && (
            <PricingBreakdown
              laborHours={job.labor_hours}
              laborRate={job.labor_rate}
              partsCost={job.parts_cost}
              totalCost={job.total_cost}
              services={services}
              isPaid={invoice?.status === 'paid'}
              variant="default"
            />
          )}

          {/* Invoice Link */}
          {invoice && (
            <Link
              href={`/customer/invoices/${invoice.id}`}
              className="card block hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2.5 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">
                      {invoice.status === 'paid' ? 'Paid' : 'View Invoice'}
                    </p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180 group-hover:text-primary-600 transition-colors" />
              </div>
            </Link>
          )}

          {/* Contact Tech Button (when not active) */}
          {job.technician?.phone && !isActiveJob && (
            <a
              href={`tel:${job.technician.phone}`}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Technician
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    on_the_way: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'On the Way' },
    arrived: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Arrived' },
    in_progress: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'In Progress' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  }

  const { bg, text, label } = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }

  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}


