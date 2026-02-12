import { ReactNode } from 'react'
import Image from 'next/image'

interface TechnicianAvatarProps {
  name?: string | null
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

interface TechnicianAvatarGroupProps {
  technicians: Array<{
    id: string
    name?: string | null
    imageUrl?: string | null
  }>
  maxDisplay?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

const getInitials = (name?: string | null): string => {
  if (!name) return 'T'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
  }
  return name.charAt(0).toUpperCase()
}

export default function TechnicianAvatar({
  name,
  imageUrl,
  size = 'md',
  className = '',
}: TechnicianAvatarProps) {
  const initials = getInitials(name)

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        relative
        bg-gradient-to-br from-primary to-primary/80
        flex items-center justify-center
        text-white font-semibold
        shadow-sm
        ${className}
      `}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name || 'Technician'}
          fill
          className="rounded-full object-cover"
          sizes="100vw"
        />
      ) : (
        initials
      )}
    </div>
  )
}

export function TechnicianAvatarGroup({
  technicians,
  maxDisplay = 3,
  size = 'sm',
}: TechnicianAvatarGroupProps) {
  const displayTechs = technicians.slice(0, maxDisplay)
  const remainingCount = Math.max(0, technicians.length - maxDisplay)

  return (
    <div className="flex items-center">
      {displayTechs.map((tech, idx) => (
        <div
          key={tech.id}
          style={{
            marginLeft: idx > 0 ? '-8px' : '0',
            position: 'relative',
            zIndex: displayTechs.length - idx,
          }}
        >
          <TechnicianAvatar
            name={tech.name}
            imageUrl={tech.imageUrl}
            size={size}
            className="border-2 border-white dark:border-surface"
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full
            bg-surface-100
            flex items-center justify-center
            text-muted font-semibold
            border-2 border-white dark:border-surface
          `}
          style={{
            marginLeft: '-8px',
            position: 'relative',
            zIndex: 0,
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
