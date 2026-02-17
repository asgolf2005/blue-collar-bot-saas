import React from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle } from '@/components/ui/lucide'

interface FormAlertProps {
  type: 'success' | 'danger' | 'info' | 'warning'
  message: string
  onClose?: () => void
}

export function FormAlert({ type, message, onClose }: FormAlertProps) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    danger: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
  }

  const colors = {
    success: 'text-success',
    danger: 'text-danger',
    info: 'text-primary',
    warning: 'text-warning',
  }

  return (
    <div className={`alert-premium alert-${type} flex items-start gap-3`}>
      <div className={colors[type]}>
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${colors[type]}`}>
          {message}
        </p>
      </div>
      {onClose && (
        <button type="button"
          onClick={onClose}
          className={`${colors[type]} hover:opacity-70 transition-opacity`}
          aria-label="Close alert"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}


