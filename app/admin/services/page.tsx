'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ActionIconButton } from '@/components/ui/ActionSystem'
import {
  Plus, 
  Briefcase, 
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  Bath,
  Droplets,
  RotateCcw,
  Flame,
  Wrench,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  X,
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

// Types
interface Service {
  id: string
  name: string
  description: string | null
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  times_booked?: number
  times_completed?: number
}

const NEW_SERVICE_BUTTON_CLASS =
  'text-xs px-5 py-2.5 transition-all whitespace-nowrap flex-nowrap rounded-full border border-cyan-400/50 bg-slate-900 text-cyan-300 font-mono shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)] hover:bg-cyan-500/10 dark:border-cyan-300/60 dark:bg-slate-950 dark:text-cyan-200'

// Contextual icon mapping based on service name keywords
function getServiceIcon(serviceName: string) {
  const name = serviceName.toLowerCase()
  
  // Toilet/Bathroom/WC keywords
  if (/\b(toilet|bathroom|wc|restroom|lavatory)\b/.test(name)) {
    return { icon: Bath, color: 'cyan', label: 'Bathroom' }
  }
  
  // Pipe/Leak/Faucet keywords
  if (/\b(pipe|leak|faucet|plumbing|water|flow)\b/.test(name)) {
    return { icon: Droplets, color: 'blue', label: 'Plumbing' }
  }
  
  // Drain/Clog/Sewer keywords
  if (/\b(drain|clog|sewer|blockage|backup)\b/.test(name)) {
    return { icon: RotateCcw, color: 'amber', label: 'Drain' }
  }
  
  // Heater/Hot water/Boiler keywords
  if (/\b(heater|hot water|boiler|tank|heating|warm)\b/.test(name)) {
    return { icon: Flame, color: 'orange', label: 'Heating' }
  }
  
  // Install/New/Setup keywords
  if (/\b(install|installation|new|setup|replacement)\b/.test(name)) {
    return { icon: PlusCircle, color: 'emerald', label: 'Install' }
  }
  
  // Emergency/Urgent keywords
  if (/\b(emergency|urgent|rush|asap|immediate)\b/.test(name)) {
    return { icon: AlertTriangle, color: 'red', label: 'Emergency' }
  }
  
  // Repair/Fix/Maintenance keywords (default-ish but specific)
  if (/\b(repair|fix|maintenance|service|inspect)\b/.test(name)) {
    return { icon: Wrench, color: 'slate', label: 'Repair' }
  }
  
  // Default
  return { icon: Wrench, color: 'slate', label: 'Service' }
}

// Color classes for icons
const colorClasses: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  cyan: { 
    bg: 'bg-cyan-100', 
    text: 'text-cyan-600', 
    darkBg: 'dark:bg-cyan-500/20', 
    darkText: 'dark:text-cyan-400' 
  },
  blue: { 
    bg: 'bg-blue-100', 
    text: 'text-blue-600', 
    darkBg: 'dark:bg-blue-500/20', 
    darkText: 'dark:text-blue-400' 
  },
  amber: { 
    bg: 'bg-amber-100', 
    text: 'text-amber-600', 
    darkBg: 'dark:bg-amber-500/20', 
    darkText: 'dark:text-amber-400' 
  },
  orange: { 
    bg: 'bg-orange-100', 
    text: 'text-orange-600', 
    darkBg: 'dark:bg-orange-500/20', 
    darkText: 'dark:text-orange-400' 
  },
  emerald: { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-600', 
    darkBg: 'dark:bg-emerald-500/20', 
    darkText: 'dark:text-emerald-400' 
  },
  red: { 
    bg: 'bg-red-100', 
    text: 'text-red-600', 
    darkBg: 'dark:bg-red-500/20', 
    darkText: 'dark:text-red-400' 
  },
  slate: { 
    bg: 'bg-slate-100', 
    text: 'text-slate-600', 
    darkBg: 'dark:bg-slate-500/20', 
    darkText: 'dark:text-slate-400' 
  },
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'admin') return
      setIsAdmin(true)

      // Get all services for this business
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })

      // Get usage stats for each service from job_services join table
      const { data: serviceUsage } = await supabase
        .from('job_services')
        .select('service_id, job_id, jobs!inner(status)')
        .eq('jobs.business_id', profile.business_id)

      // Calculate stats
      const servicesWithStats = (servicesData || []).map(service => {
        const usage = serviceUsage?.filter((u: any) => u.service_id === service.id) || []
        const completedJobs = usage.filter((u: any) => {
          const job = u.jobs as any
          return job?.status === 'completed'
        }).length
        const totalBooked = usage.length

        return {
          ...service,
          times_booked: totalBooked,
          times_completed: completedJobs,
        }
      })

      setServices(servicesWithStats)
      setLoading(false)
    }

    loadServices()
  }, [])

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services
    
    const query = searchQuery.toLowerCase()
    return services.filter(service => 
      service.name.toLowerCase().includes(query) ||
      (service.description?.toLowerCase().includes(query) ?? false)
    )
  }, [services, searchQuery])

  const activeServices = filteredServices.filter(s => s.is_active)
  const inactiveServices = filteredServices.filter(s => !s.is_active)

  // Calculate totals from ALL services (not filtered)
  const totalBooked = services.reduce((sum, s) => sum + (s.times_booked || 0), 0)
  const totalCompleted = services.reduce((sum, s) => sum + (s.times_completed || 0), 0)

  // Format current date
  const now = new Date()
  const sysTime = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase().replace(/,/g, '')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
              SERVICES
            </h1>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
              SYS.TIME: {sysTime}
            </p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse font-mono text-sm text-slate-400">LOADING...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            SERVICES
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Link href="/admin/services/new">
            <Button
              className={NEW_SERVICE_BUTTON_CLASS}
              icon={<Plus className="h-4 w-4" />}
            >
              NEW SERVICE
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics - Clean Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="TOTAL SERVICES"
          value={services.length}
          icon={Briefcase}
          color="blue"
        />
        <MetricCard
          label="ACTIVE"
          value={services.filter(s => s.is_active).length}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          label="TIMES BOOKED"
          value={totalBooked}
          icon={Clock}
          color="cyan"
        />
        <MetricCard
          label="COMPLETED"
          value={totalCompleted}
          icon={CheckCircle2}
          color="purple"
        />
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl 
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                     placeholder-slate-400 font-mono text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                     transition-all"
        />
        {searchQuery && (
          <ActionIconButton
            stylePreset="ambient"
            intent="ghost"
            size="xs"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            aria-label="Clear search"
            title="Clear search"
            icon={<X className="h-3.5 w-3.5" />}
          />
        )}
      </div>

      {/* Active Services */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">ACTIVE SERVICES</h2>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 tracking-wider">
                {activeServices.length} {activeServices.length === 1 ? 'SERVICE' : 'SERVICES'} AVAILABLE
              </p>
            </div>
            {searchQuery && (
              <span className="font-mono text-[10px] text-slate-400">
                FILTERED FROM {services.filter(s => s.is_active).length}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          {activeServices.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-600 font-mono text-sm">
              {searchQuery ? 'No services match your search' : 'No active services'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Archived Services */}
      {inactiveServices.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm opacity-70">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-display text-xl text-slate-500 dark:text-slate-400 tracking-wide">ARCHIVED SERVICES</h2>
            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-1 tracking-wider">
              {inactiveServices.length} INACTIVE {inactiveServices.length === 1 ? 'SERVICE' : 'SERVICES'}
            </p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {inactiveServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Metric Card - Clean
function MetricCard({ 
  label, 
  value, 
  icon: Icon,
  color
}: { 
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, { light: string; dark: string }> = {
    blue: { light: 'text-blue-600', dark: 'dark:text-blue-400' },
    cyan: { light: 'text-cyan-600', dark: 'dark:text-cyan-400' },
    emerald: { light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
    purple: { light: 'text-purple-600', dark: 'dark:text-purple-400' },
  }
  const c = colors[color]

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className={`w-4 h-4 ${c.light} ${c.dark}`} />
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

// Service Card with Contextual Icon
function ServiceCard({ service }: { service: Service }) {
  const { icon: IconComponent, color } = getServiceIcon(service.name)
  const colors = colorClasses[color]

  // Format price range (show as range if duration exists, or single price)
  const formattedPrice =
    typeof service.base_price === 'number' && Number.isFinite(service.base_price)
      ? service.base_price.toFixed(0)
      : '--'

  return (
    <Link href={`/admin/services/${service.id}`}>
      <div className="group p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all h-full flex flex-col">
        {/* Icon - Large contextual */}
        <div className="mb-4">
          <div className={`w-14 h-14 rounded-2xl ${colors.bg} ${colors.darkBg} flex items-center justify-center`}>
            <IconComponent className={`w-7 h-7 ${colors.text} ${colors.darkText}`} />
          </div>
        </div>

        {/* Service Name */}
        <h3 className="font-display text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
          {service.name}
        </h3>

        {/* Price & Duration Row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-4 h-4" />
            <span className="font-mono text-lg font-medium">{formattedPrice}</span>
          </div>
          {service.duration_minutes && (
            <>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">{service.duration_minutes} min</span>
              </div>
            </>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 flex-grow">
            {service.description}
          </p>
        )}

        {/* Stats Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">BOOKED:</span>
              <span className="font-mono text-xs font-medium text-slate-900 dark:text-white">{service.times_booked || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">DONE:</span>
              <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">{service.times_completed || 0}</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}

