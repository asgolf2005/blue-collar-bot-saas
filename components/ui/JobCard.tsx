import Link from 'next/link'
import { format } from 'date-fns'
import { Clock, Calendar, MapPin } from '@/components/ui/lucide'
import InfoPill from './InfoPill'
import CountdownBadge from './CountdownBadge'

interface JobCardProps {
  job: {
    id: string
    title: string
    description: string
    startTime: Date
    endTime: Date
    address: string
    technicians: string[]
    isUrgent: boolean
    countdown?: string
  }
  isPriority?: boolean
}

export default function JobCard({ job, isPriority = false }: JobCardProps) {
  const showCountdown = isPriority && job.countdown
  const cardVariant = isPriority && job.isUrgent ? 'urgent' : 'default'

  return (
    <Link
      href={`/admin/jobs/${job.id}`}
      className={`block cursor-pointer rounded-2xl p-5 relative transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        cardVariant === 'urgent'
          ? 'bg-warning-400 shadow-[0_2px_8px_rgba(251,191,36,0.2)]'
          : 'bg-surface-50 shadow-sm'
      }`}
    >
      {/* Countdown Badge */}
      {showCountdown && job.countdown && (
        <CountdownBadge
          countdown={job.countdown}
          variant={job.isUrgent ? 'urgent' : 'default'}
        />
      )}

      {/* Title */}
      <div
        className={`text-lg font-bold mb-1 ${
          cardVariant === 'urgent' ? 'text-warning-900 dark:text-warning-950' : 'text-ink'
        }`}
      >
        {job.title}
      </div>

      {/* Description */}
      <div
        className={`text-sm mb-4 ${
          cardVariant === 'urgent' ? 'text-warning-800 dark:text-warning-900' : 'text-muted'
        }`}
      >
        {job.description}
      </div>

      {/* Info Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Time */}
        <InfoPill
          icon={<Clock style={{ width: '100%', height: '100%' }} />}
          variant={cardVariant === 'urgent' ? 'urgent' : 'default'}
        >
          {format(job.startTime, 'HH:mm')} - {format(job.endTime, 'HH:mm')}
        </InfoPill>

        {/* Date */}
        <InfoPill
          icon={<Calendar style={{ width: '100%', height: '100%' }} />}
          variant={cardVariant === 'urgent' ? 'urgent' : 'default'}
        >
          {format(job.startTime, 'MMMM d')}
        </InfoPill>

        {/* Location */}
        <InfoPill
          icon={<MapPin style={{ width: '100%', height: '100%' }} />}
          variant={cardVariant === 'urgent' ? 'urgent' : 'default'}
          maxWidth="200px"
        >
          {job.address}
        </InfoPill>
      </div>

      {/* Technicians */}
      {job.technicians.length > 0 && (
        <div className="flex items-center gap-2">
          {job.technicians.slice(0, 3).map((tech, techIdx) => (
            <div
              key={techIdx}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold text-white bg-gradient-to-br from-primary-500 to-primary-400 ${
                cardVariant === 'urgent' ? 'border-warning-400' : 'border-surface-50 dark:border-surface-800'
              }`}
            >
              {tech.charAt(0)}
            </div>
          ))}

          {job.technicians.length > 3 && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                cardVariant === 'urgent'
                  ? 'bg-white/70 text-warning-800'
                  : 'bg-white dark:bg-surface text-muted'
              }`}
            >
              +{job.technicians.length - 3}
            </div>
          )}
        </div>
      )}
    </Link>
  )
}


