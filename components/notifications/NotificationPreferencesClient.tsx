'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, X } from 'lucide-react'
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types'
import type { NotificationPreference, NotificationType } from '@/lib/notifications/types'
import { showToast } from '@/lib/utils/toast'

interface NotificationPreferencesClientProps {
  userId: string
  initialPreferences: NotificationPreference[]
}

export default function NotificationPreferencesClient({
  userId,
  initialPreferences,
}: NotificationPreferencesClientProps) {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() => {
    const prefs: Record<string, boolean> = {}

    // Initialize with config defaults
    Object.keys(NOTIFICATION_CONFIG).forEach((type) => {
      const pref = initialPreferences.find((p) => p.notification_type === type)
      prefs[type] = pref ? pref.enabled : NOTIFICATION_CONFIG[type as NotificationType].defaultEnabled
    })

    return prefs
  })

  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function togglePreference(notificationType: string) {
    const newValue = !preferences[notificationType]

    // Optimistic update
    setPreferences((prev) => ({ ...prev, [notificationType]: newValue }))

    try {
      // Upsert preference
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            notification_type: notificationType,
            enabled: newValue,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,notification_type',
          }
        )

      if (error) throw error

      showToast.success(
        newValue
          ? `${NOTIFICATION_CONFIG[notificationType as NotificationType].label} notifications enabled`
          : `${NOTIFICATION_CONFIG[notificationType as NotificationType].label} notifications disabled`
      )
    } catch (error) {
      // Revert on error
      setPreferences((prev) => ({ ...prev, [notificationType]: !newValue }))
      showToast.error('Failed to update preference')
    }
  }

  async function enableAll() {
    setSaving(true)
    try {
      const updates = Object.keys(NOTIFICATION_CONFIG).map((type) => ({
        user_id: userId,
        notification_type: type,
        enabled: true,
        updated_at: new Date().toISOString(),
      }))

      await supabase.from('notification_preferences').upsert(updates, {
        onConflict: 'user_id,notification_type',
      })

      setPreferences(
        Object.keys(NOTIFICATION_CONFIG).reduce((acc, type) => ({ ...acc, [type]: true }), {})
      )

      showToast.success('All notifications enabled')
    } catch (error) {
      showToast.error('Failed to enable all notifications')
    } finally {
      setSaving(false)
    }
  }

  async function disableAll() {
    setSaving(true)
    try {
      const updates = Object.keys(NOTIFICATION_CONFIG).map((type) => ({
        user_id: userId,
        notification_type: type,
        enabled: false,
        updated_at: new Date().toISOString(),
      }))

      await supabase.from('notification_preferences').upsert(updates, {
        onConflict: 'user_id,notification_type',
      })

      setPreferences(
        Object.keys(NOTIFICATION_CONFIG).reduce((acc, type) => ({ ...acc, [type]: false }), {})
      )

      showToast.success('All notifications disabled')
    } catch (error) {
      showToast.error('Failed to disable all notifications')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">Quick Actions</h3>
              <p className="text-xs text-muted mt-0.5">Manage all notifications at once</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={disableAll}
              disabled={saving}
              className="glass-btn-ghost glass-btn-sm"
            >
              <X className="w-4 h-4" />
              Disable All
            </button>
            <button
              onClick={enableAll}
              disabled={saving}
              className="glass-btn-primary glass-btn-sm"
            >
              <Check className="w-4 h-4" />
              Enable All
            </button>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-ink mb-4">Notification Types</h3>
        <div className="space-y-3">
          {Object.entries(NOTIFICATION_CONFIG).map(([type, config]) => {
            const isEnabled = preferences[type] ?? config.defaultEnabled
            return (
              <div
                key={type}
                className="flex items-start justify-between p-4 rounded-xl bg-surface-50/50 border border-surface-200 hover:border-primary/20 transition-all"
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl ${
                    isEnabled ? 'bg-primary/10' : 'bg-surface-100'
                  } transition-colors`}>
                    {getIcon(config.icon, isEnabled)}
                  </div>

                  {/* Label & Description */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-ink">{config.label}</h4>
                    <p className="text-sm text-muted mt-0.5">{config.description}</p>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => togglePreference(type)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${isEnabled ? 'bg-primary' : 'bg-surface-300'}
                  `}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card bg-info/5 border-info/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-info/10">
            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-info text-sm">About Notifications</h4>
            <p className="text-xs text-info/80 mt-1">
              Disabling a notification type will prevent you from receiving those notifications.
              You can always re-enable them later. Critical system notifications cannot be disabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getIcon(iconName: string, isEnabled: boolean) {
  const className = `w-5 h-5 ${isEnabled ? 'text-primary' : 'text-muted'}`

  switch (iconName) {
    case 'briefcase':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      )
    case 'user-plus':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      )
    case 'refresh':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
        </svg>
      )
    case 'file-text':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case 'dollar-sign':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'bell':
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      )
  }
}
