'use client'

import { Business, User as UserType } from '@/lib/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users as UsersIcon, 
  Building2, 
  UserPlus, 
  Trash2, 
  Save, 
  Phone, 
  Mail, 
  MessageSquare, 
  Bell,
  User as UserIcon,
  Database,
  Download,
  Upload,
  KeyRound,
  Lock,
  Unlock,
} from '@/components/ui/icons'
import AddressAutocomplete from '@/components/common/AddressAutocomplete'
import { useRouter } from 'next/navigation'

export default function SettingsForm({
  business,
  technicians
}: {
  business: Business
  technicians: UserType[]
}) {
  interface ImportSummary {
    customersImported: number
    customersSkipped: number
    jobsImported: number
    jobsSkipped: number
    errors: string[]
  }

  const router = useRouter()
  const supabase = createClient()

  // Business settings state
  const [name, setName] = useState(business.name)
  const [address, setAddress] = useState(business.address || '')
  const [email, setEmail] = useState(business.email || '')
  const [phone, setPhone] = useState(business.phone || '')
  // Note: website field - add to Business type if needed
  const [calendarId, setCalendarId] = useState(business.primary_calendar_id || '')
  const [saving, setSaving] = useState(false)

  // Notification settings state
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(business.sms_enabled || false)

  // SMS detailed settings state
  const [smsNotifications, setSmsNotifications] = useState(
    business.sms_notifications || {
      jobScheduled: true,
      technicianAssigned: true,
      onTheWay: true,
      arrived: true,
      inProgress: false,
      completed: true,
      invoiceSent: true,
      paymentReceived: true,
      rescheduled: true,
      cancelled: true,
      reminderOneDayBefore: true,
      reminderOneHourBefore: true,
    }
  )

  // Tech management state
  const [showAddTech, setShowAddTech] = useState(false)
  const [newTechEmail, setNewTechEmail] = useState('')
  const [newTechName, setNewTechName] = useState('')
  const [newTechPhone, setNewTechPhone] = useState('')
  const [addingTech, setAddingTech] = useState(false)
  const [vaultUnlocked, setVaultUnlocked] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminUnlockPassword, setAdminUnlockPassword] = useState('')
  const [vaultAuthPassword, setVaultAuthPassword] = useState('')
  const [unlockingVault, setUnlockingVault] = useState(false)
  const [techDraftPasswords, setTechDraftPasswords] = useState<Record<string, string>>({})
  const [updatingTechPasswordId, setUpdatingTechPasswordId] = useState<string | null>(null)
  const [techPasswordMap, setTechPasswordMap] = useState<Record<string, string>>({})
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const resolvedEmail = data.user?.email || ''
      setAdminEmail(resolvedEmail)
    })
    return () => {
      mounted = false
    }
  }, [supabase])

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name,
          address,
          email,
          phone,

          primary_calendar_id: calendarId,
          sms_enabled: smsAlerts,
          sms_notifications: smsNotifications,
        })
        .eq('id', business.id)

      if (error) throw error

      alert('Business settings saved successfully')
      router.refresh()
    } catch (error: any) {
      alert('Failed to save settings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          sms_enabled: smsAlerts,
          sms_notifications: smsNotifications,
        })
        .eq('id', business.id)

      if (error) throw error

      alert('Notification settings saved successfully')
      router.refresh()
    } catch (error: any) {
      alert('Failed to save settings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSmsNotificationToggle = (key: string) => {
    setSmsNotifications((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleAddTechnician = async () => {
    if (!newTechEmail || !newTechName) {
      alert('Please enter email and name')
      return
    }

    setAddingTech(true)
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          business_id: business.id,
          email: newTechEmail,
          full_name: newTechName,
          phone: newTechPhone || null,
          role: 'tech',
        })

      if (error) throw error

      alert(`${newTechName} added successfully`)
      setNewTechEmail('')
      setNewTechName('')
      setNewTechPhone('')
      setShowAddTech(false)
      router.refresh()
    } catch (error: any) {
      alert('Failed to add technician: ' + error.message)
    } finally {
      setAddingTech(false)
    }
  }

  const handleRemoveTech = async (techId: string, techName: string) => {
    if (!confirm(`Remove ${techName}? They will no longer have access.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', techId)

      if (error) throw error

      alert(`${techName} removed`)
      router.refresh()
    } catch (error: any) {
      alert('Failed to remove technician: ' + error.message)
    }
  }

  const downloadImportTemplate = () => {
    const template = {
      customers: [
        {
          name: 'Acme Property Group',
          phone: '+1 555 0101',
          email: 'accounts@acme.example',
          address: '123 Main Street, Springfield',
        },
      ],
      jobs: [
        {
          customer_email: 'accounts@acme.example',
          scheduled_start: '2025-12-01T09:00:00Z',
          scheduled_end: '2025-12-01T11:00:00Z',
          status: 'completed',
          description: 'Replaced leaking shutoff valve',
          urgency: 'medium',
          total_cost: 325,
        },
      ],
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'blue-collar-import-template.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImportData = async () => {
    if (!importFile) {
      setImportError('Please choose a file to import.')
      return
    }

    setImportLoading(true)
    setImportError(null)
    setImportSummary(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/onboarding/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import data')
      }

      setImportSummary(result.summary)
    } catch (error: any) {
      setImportError(error.message || 'Failed to import data')
    } finally {
      setImportLoading(false)
    }
  }

  const handleUnlockPasswordVault = async () => {
    if (!adminEmail) {
      alert('Unable to resolve admin account email for unlock')
      return
    }

    if (!adminUnlockPassword.trim()) {
      alert('Enter your admin password to unlock')
      return
    }

    setUnlockingVault(true)
    try {
      const response = await fetch('/api/admin/technicians/password-vault/unlock', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminUnlockPassword,
          businessId: business.id,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Invalid admin password')
      }

      setVaultUnlocked(true)
      setVaultAuthPassword(adminUnlockPassword)
      setTechPasswordMap(result.passwords || {})
      setAdminUnlockPassword('')
    } catch (error: any) {
      alert('Unable to unlock: ' + error.message)
    } finally {
      setUnlockingVault(false)
    }
  }

  const handleSetTechnicianPassword = async (techId: string, techName: string) => {
    if (!vaultUnlocked || !vaultAuthPassword || !adminEmail) {
      alert('Unlock with admin password first')
      return
    }

    const password = (techDraftPasswords[techId] || '').trim()
    if (password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    setUpdatingTechPasswordId(techId)
    try {
      const response = await fetch(`/api/admin/technicians/${techId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          adminEmail,
          adminPassword: vaultAuthPassword,
          businessId: business.id,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update technician password')
      }

      setTechPasswordMap((prev) => ({ ...prev, [techId]: password }))
      setTechDraftPasswords((prev) => ({ ...prev, [techId]: '' }))
      alert(`Password updated for ${techName}`)
    } catch (error: any) {
      alert('Failed to update technician password: ' + error.message)
    } finally {
      setUpdatingTechPasswordId(null)
    }
  }

  const sectionCardClass =
    'overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-elevation-1 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/90'
  const sectionHeaderClass =
    'border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-950/40'
  const sectionHeaderWithActionClass = `${sectionHeaderClass} flex flex-wrap items-center justify-between gap-3`
  const sectionIconClass =
    'shrink-0 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80'
  const sectionHintClass = 'mt-1 font-sans text-sm text-slate-500 dark:text-slate-400'
  const labelClass =
    'mb-2 block font-sans text-sm font-medium text-slate-600 dark:text-slate-300'
  const inputBaseClass =
    'w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 font-sans text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
  const iconInputBaseClass =
    'w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-4 font-sans text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
  const configuredFields = [name, address, email, phone].filter((value) => value?.trim()).length
  const enabledNotificationCount = Object.values(smsNotifications as Record<string, boolean>).filter(Boolean).length

  return (
    <div className="space-y-6 font-sans">
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-elevation-1 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/90">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Settings Map
            </p>
            <div className="mt-3 space-y-2">
              <a href="#settings-account" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300">
                Account
                <UserIcon className="h-4 w-4" />
              </a>
              <a href="#settings-business" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300">
                Business
                <Building2 className="h-4 w-4" />
              </a>
              <a href="#settings-notifications" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300">
                Notifications
                <Bell className="h-4 w-4" />
              </a>
              <a href="#settings-team" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300">
                Team
                <UsersIcon className="h-4 w-4" />
              </a>
              <a href="#settings-data" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300">
                Data + Integration
                <Database className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-elevation-1 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/90">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Snapshot
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm text-slate-600 dark:text-slate-300">Business fields</span>
                <span className="font-mono text-sm text-cyan-600 dark:text-cyan-400">{configuredFields}/4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm text-slate-600 dark:text-slate-300">Technicians</span>
                <span className="font-mono text-sm text-cyan-600 dark:text-cyan-400">{technicians.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm text-slate-600 dark:text-slate-300">SMS events enabled</span>
                <span className="font-mono text-sm text-cyan-600 dark:text-cyan-400">{enabledNotificationCount}</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div id="settings-account" className={sectionCardClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-3">
              <div className={sectionIconClass}>
                <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                Profile
              </h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className={inputBaseClass}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className={labelClass}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  defaultValue={business.email || ''}
                  className={iconInputBaseClass}
                  placeholder="admin@company.com"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  defaultValue=""
                  className={iconInputBaseClass}
                  placeholder="0412 345 678"
                />
              </div>
            </div>
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="admin-btn-primary font-sans text-xs px-5 py-2.5 rounded-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  SAVE PROFILE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Business Card */}
        <div id="settings-business" className={sectionCardClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-3">
              <div className={sectionIconClass}>
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                Business
              </h2>
            </div>
          </div>
          <form onSubmit={handleSaveBusiness} className="p-5 space-y-4">
            <div>
              <label className={labelClass}>
                Company Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputBaseClass}
                placeholder="Your Business Name"
              />
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/30">
              <div>
                <label className={labelClass}>Business Address</label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main St, Sydney NSW 2000"
                  className={inputBaseClass}
                  showApiHint={false}
                />
                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Maps key missing</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Google Calendar ID</label>
                <input
                  type="text"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className={inputBaseClass}
                  placeholder="your-calendar-id@group.calendar.google.com"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">AI availability source</p>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="admin-btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'SAVING...' : 'SAVE BUSINESS'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications Card - Full Width */}
      <div id="settings-notifications" className={sectionCardClass}>
        <div className={sectionHeaderClass}>
          <div className="flex items-center gap-3">
            <div className={sectionIconClass}>
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h2>
              <p className={sectionHintClass}>
                Configure how you receive alerts and updates
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Alerts Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={sectionIconClass}>
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-sans text-sm font-semibold text-slate-900 dark:text-white">
                    Email Alerts
                  </div>
                  <div className="font-sans text-xs text-slate-500 dark:text-slate-400">
                    Receive updates via email
                  </div>
                </div>
              </div>
              <Toggle 
                checked={emailAlerts} 
                onChange={setEmailAlerts}
                color="blue"
              />
            </div>

            {/* SMS Alerts Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={sectionIconClass}>
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-sans text-sm font-semibold text-slate-900 dark:text-white">
                    SMS Alerts
                  </div>
                  <div className="font-sans text-xs text-slate-500 dark:text-slate-400">
                    Receive text message notifications
                  </div>
                </div>
              </div>
              <Toggle 
                checked={smsAlerts} 
                onChange={setSmsAlerts}
                color="green"
              />
            </div>
          </div>

          {/* SMS Notification Types */}
          {smsAlerts && (
            <div className="mt-6 border-t border-slate-200/80 pt-6 dark:border-slate-700/80">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/5">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-sans text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Setup Required
                  </div>
                  <div className="mt-1 font-sans text-xs text-amber-700 dark:text-amber-400">
                    Add your Twilio credentials to environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                  </div>
                </div>
              </div>

              <h3 className={labelClass}>
                Notification Types
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(smsNotifications).map(([key, value]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-slate-50/90 p-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                  >
                    <span className="font-sans text-xs text-slate-700 dark:text-slate-300">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())}
                    </span>
                    <Toggle
                      checked={value as boolean}
                      onChange={() => handleSmsNotificationToggle(key)}
                      color="cyan"
                      size="sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={saving}
              className="admin-btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'SAVING...' : 'SAVE NOTIFICATIONS'}
            </button>
          </div>
        </div>
      </div>

      {/* Technicians Card - Full Width */}
      <div id="settings-team" className={sectionCardClass}>
        <div className={sectionHeaderWithActionClass}>
          <div className="flex items-center gap-3">
            <div className={sectionIconClass}>
              <UsersIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                Technicians
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <UsersIcon className="h-3.5 w-3.5" />
                  {technicians.length}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${vaultUnlocked ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
                  {vaultUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTech(!showAddTech)}
            className="admin-btn-primary inline-flex h-9 w-9 items-center justify-center rounded-full p-0 transition-all"
            title={showAddTech ? 'Hide add technician form' : 'Add technician'}
          >
            <UserPlus className="w-4 h-4" />
            <span className="sr-only">{showAddTech ? 'Hide add technician form' : 'Add technician'}</span>
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={adminUnlockPassword}
                  onChange={(e) => setAdminUnlockPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 font-sans text-xs text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Admin password"
                />
              </div>
              {vaultUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    setVaultUnlocked(false)
                    setVaultAuthPassword('')
                    setTechPasswordMap({})
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                  title="Lock vault"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="sr-only">Lock vault</span>
                </button>
              ) : (
                <button
                    type="button"
                    onClick={handleUnlockPasswordVault}
                    disabled={unlockingVault}
                    className="admin-btn-primary inline-flex items-center justify-center rounded-full p-2 text-[11px] transition-all disabled:opacity-50"
                    title={unlockingVault ? 'Unlocking vault' : 'Unlock vault'}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span className="sr-only">{unlockingVault ? 'Unlocking vault' : 'Unlock vault'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Add Technician Form */}
          {showAddTech && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <h3 className="mb-3 font-sans text-sm font-semibold text-slate-900 dark:text-white">
                Add New Technician
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="email"
                  value={newTechEmail}
                  onChange={(e) => setNewTechEmail(e.target.value)}
                  className={inputBaseClass}
                  placeholder="Email *"
                />
                <input
                  type="text"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  className={inputBaseClass}
                  placeholder="Full Name *"
                />
                <input
                  type="tel"
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  className={inputBaseClass}
                  placeholder="Phone (optional)"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAddTechnician}
                  disabled={addingTech}
                  className="admin-btn-primary rounded-full px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {addingTech ? 'ADDING...' : 'ADD TECHNICIAN'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTech(false)
                    setNewTechEmail('')
                    setNewTechName('')
                    setNewTechPhone('')
                  }}
                  className="admin-btn-secondary font-sans text-xs px-4 py-2 rounded-md transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Technicians List */}
          {technicians.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <UsersIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
                No technicians added yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {technicians.map((tech) => {
                const inlinePasswordValue =
                  techDraftPasswords[tech.id] ??
                  (vaultUnlocked ? techPasswordMap[tech.id] || '' : '')

                return (
                  <div 
                    key={tech.id} 
                    className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/90 p-3 transition-colors hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-cyan-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-purple-200 bg-purple-100 dark:border-purple-400/20 dark:bg-purple-400/10">
                          <span className="font-sans text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {tech.full_name || 'Unnamed'}
                          </div>
                          <div className="font-sans text-xs text-slate-500 dark:text-slate-400 truncate">
                            {tech.email}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech.id, tech.full_name || tech.email)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-400/10 rounded-lg transition-colors flex-shrink-0"
                        title="Remove technician"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700">
                      <KeyRound className="ml-1 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={inlinePasswordValue}
                        onChange={(e) =>
                          setTechDraftPasswords((prev) => ({ ...prev, [tech.id]: e.target.value }))
                        }
                        disabled={!vaultUnlocked}
                        className="min-w-0 flex-1 bg-transparent px-1 py-1 font-mono text-xs text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-slate-100"
                        placeholder={vaultUnlocked ? 'Min 8 chars' : 'Unlock vault'}
                      />
                      <button
                        type="button"
                        onClick={() => handleSetTechnicianPassword(tech.id, tech.full_name || tech.email)}
                        disabled={!vaultUnlocked || updatingTechPasswordId === tech.id}
                        className="admin-btn-primary inline-flex h-7 w-7 items-center justify-center rounded-full p-0 transition-all disabled:opacity-50"
                        title={updatingTechPasswordId === tech.id ? 'Saving password' : 'Save password'}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span className="sr-only">
                          {updatingTechPasswordId === tech.id ? 'Saving password' : 'Save password'}
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Data Import Card */}
      <div id="settings-data" className={sectionCardClass}>
        <div className={sectionHeaderClass}>
          <div className="flex items-center gap-3">
            <div className={sectionIconClass}>
              <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                Data Import
              </h2>
              <p className={sectionHintClass}>
                Import customers and jobs from JSON, CSV, XLSX, or XLS
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="font-sans text-sm text-slate-600 dark:text-slate-300">
            For Excel, use sheet names <span className="font-semibold">customers</span> and <span className="font-semibold">jobs</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={downloadImportTemplate}
              className="admin-btn-secondary flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD TEMPLATE
            </button>

            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950">
              <Upload className="w-4 h-4 text-slate-500" />
              <span className="truncate font-sans text-sm text-slate-600 dark:text-slate-300">
                {importFile ? importFile.name : 'Choose file'}
              </span>
              <input
                type="file"
                accept=".json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleImportData}
            disabled={importLoading || !importFile}
            className="admin-btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importLoading ? 'IMPORTING...' : 'IMPORT CUSTOMERS & JOBS'}
          </button>

          {importError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-400/30 dark:bg-rose-400/10">
              <p className="font-sans text-sm text-rose-700 dark:text-rose-300">{importError}</p>
            </div>
          )}

          {importSummary && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-400/30 dark:bg-emerald-400/10">
              <p className="mb-1 font-sans text-sm text-emerald-700 dark:text-emerald-300">
                Imported: {importSummary.customersImported} customers, {importSummary.jobsImported} jobs
              </p>
              <p className="mb-2 font-sans text-sm text-emerald-700 dark:text-emerald-300">
                Skipped: {importSummary.customersSkipped} customers, {importSummary.jobsSkipped} jobs
              </p>
              {importSummary.errors.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 max-h-28 overflow-auto">
                  {importSummary.errors.slice(0, 5).map((item, idx) => (
                    <li key={`${item}-${idx}`} className="font-sans text-xs text-amber-700 dark:text-amber-300">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business ID Card */}
      <div className={sectionCardClass}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Business ID
            </div>
            <code className="mt-1 block font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
              {business.id}
            </code>
          </div>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 sm:text-right">
            Use this ID to configure your n8n webhook integration
          </p>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

// Modern iOS-style Toggle Component
function Toggle({ 
  checked, 
  onChange, 
  color = 'blue',
  size = 'md'
}: { 
  checked: boolean
  onChange: (value: boolean) => void
  color?: 'blue' | 'green' | 'cyan' | 'amber' | 'purple' | 'emerald'
  size?: 'sm' | 'md'
}) {
  const colors: Record<string, { bg: string }> = {
    blue: { bg: 'bg-blue-600 dark:bg-blue-500' },
    green: { bg: 'bg-green-600 dark:bg-green-500' },
    cyan: { bg: 'bg-cyan-600 dark:bg-cyan-500' },
    amber: { bg: 'bg-amber-600 dark:bg-amber-500' },
    purple: { bg: 'bg-purple-600 dark:bg-purple-500' },
    emerald: { bg: 'bg-emerald-600 dark:bg-emerald-500' },
  }
  
  const c = colors[color]
  const sizeClasses = size === 'sm' 
    ? 'w-9 h-5 after:h-4 after:w-4 after:top-0.5 after:left-0.5' 
    : 'w-11 h-6 after:h-5 after:w-5 after:top-0.5 after:left-0.5'

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div 
        className={`${sizeClasses} bg-slate-300 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-cyan-400/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:bg-white after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:transition-all ${checked ? c.bg : ''}`}
      />
    </label>
  )
}







