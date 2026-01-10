/**
 * Toast notification utilities
 * Using react-hot-toast for beautiful, accessible toasts
 */

import toast from 'react-hot-toast'

export const showToast = {
  /**
   * Success toast
   */
  success: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: '#fff',
        padding: '16px',
        borderRadius: '10px',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10b981',
      },
    })
  },

  /**
   * Error toast
   */
  error: (message: string, options?: { duration?: number }) => {
    return toast.error(message, {
      duration: options?.duration || 5000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        padding: '16px',
        borderRadius: '10px',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    })
  },

  /**
   * Info toast
   */
  info: (message: string, options?: { duration?: number }) => {
    return toast(message, {
      duration: options?.duration || 4000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
        padding: '16px',
        borderRadius: '10px',
        fontWeight: '500',
      },
    })
  },

  /**
   * Warning toast
   */
  warning: (message: string, options?: { duration?: number }) => {
    return toast(message, {
      duration: options?.duration || 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
        padding: '16px',
        borderRadius: '10px',
        fontWeight: '500',
      },
    })
  },

  /**
   * Loading toast (returns ID to dismiss later)
   */
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        background: '#1f3a5f',
        color: '#fff',
        padding: '16px',
        borderRadius: '10px',
        fontWeight: '500',
      },
    })
  },

  /**
   * Dismiss a specific toast
   */
  dismiss: (toastId: string) => {
    toast.dismiss(toastId)
  },

  /**
   * Promise toast - shows loading, then success/error
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        position: 'top-right',
        style: {
          padding: '16px',
          borderRadius: '10px',
          fontWeight: '500',
        },
      }
    )
  },

  /**
   * Custom toast with action button
   */
  withAction: (
    message: string,
    action: { label: string; onClick: () => void },
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    const colors = {
      success: { bg: '#10b981', text: '#fff' },
      error: { bg: '#ef4444', text: '#fff' },
      info: { bg: '#3b82f6', text: '#fff' },
    }

    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          style={{ background: colors[type].bg, color: colors[type].text }}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/20">
            <button
              onClick={() => {
                action.onClick()
                toast.dismiss(t.id)
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {action.label}
            </button>
          </div>
          <div className="flex border-l border-white/20">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg px-4 flex items-center justify-center text-sm font-medium hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      ),
      { duration: 6000, position: 'top-right' }
    )
  },
}

// Convenience exports
export const toast_success = showToast.success
export const toast_error = showToast.error
export const toast_info = showToast.info
export const toast_warning = showToast.warning
export const toast_loading = showToast.loading
export const toast_promise = showToast.promise
