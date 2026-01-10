'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  divider?: boolean // Show divider after this item
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  className?: string
  buttonClassName?: string
  align?: 'left' | 'right'
}

export default function ContextMenu({
  items,
  className,
  buttonClassName,
  align = 'right',
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return
    item.onClick()
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={cn(
          'p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors',
          isOpen && 'bg-surface-100 dark:bg-surface-800',
          buttonClassName
        )}
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4 text-muted" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            'absolute top-full mt-1 min-w-[180px] glass-card py-1 shadow-lg z-50 animate-slide-up',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, index) => (
            <div key={index}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleItemClick(item)
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  !item.disabled && item.variant === 'danger' && 'text-danger hover:bg-danger/10',
                  !item.disabled && item.variant !== 'danger' && 'text-ink hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                {item.icon && (
                  <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </button>
              {item.divider && (
                <div className="my-1 border-t border-surface-200 dark:border-surface-700" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
