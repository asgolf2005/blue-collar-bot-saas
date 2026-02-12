'use client'

import { Business, User as UserType } from '@/lib/types'
import { useState } from 'react'
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
  Globe,
  MapPin,
  Check
} from 'lucide-react'
import AddressAutocomplete from '@/components/common/AddressAutocomplete'
import { useRouter } from 'next/navigation'

export default function SettingsForm({
  business,
  technicians
}: {
  business: Business
  technicians: UserType[]
}) {
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

  return (
    <div className="space-y-6">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-400/10 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
                PROFILE
              </h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  defaultValue={business.email || ''}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                  placeholder="admin@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  defaultValue=""
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                  placeholder="0412 345 678"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                SAVE PROFILE
              </button>
            </div>
          </div>
        </div>

        {/* Business Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-400/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
                BUSINESS
              </h2>
            </div>
          </div>
          <form onSubmit={handleSaveBusiness} className="p-5 space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                Business Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main St, Sydney NSW 2000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                Google Calendar ID
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                  placeholder="your-calendar-id@group.calendar.google.com"
                />
              </div>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                Used by the AI receptionist to check availability
              </p>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'SAVING...' : 'SAVE BUSINESS'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications Card - Full Width */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-400/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
                NOTIFICATIONS
              </h2>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">
                Configure how you receive alerts and updates
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Alerts Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-400/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-mono text-sm text-slate-900 dark:text-white">
                    Email Alerts
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
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
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-400/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-mono text-sm text-slate-900 dark:text-white">
                    SMS Alerts
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
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
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-xs text-amber-800 dark:text-amber-300 font-medium">
                    Setup Required
                  </div>
                  <div className="font-mono text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Add your Twilio credentials to environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                  </div>
                </div>
              </div>

              <h3 className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-3">
                Notification Types
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(smsNotifications).map(([key, value]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
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

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'SAVING...' : 'SAVE NOTIFICATIONS'}
            </button>
          </div>
        </div>
      </div>

      {/* Technicians Card - Full Width */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-400/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
                TECHNICIANS
              </h2>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">
                Manage team members ({technicians.length})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTech(!showAddTech)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-4 py-2 rounded-full transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            ADD TECH
          </button>
        </div>

        <div className="p-5">
          {/* Add Technician Form */}
          {showAddTech && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h3 className="font-mono text-xs text-slate-900 dark:text-white font-medium mb-3">
                Add New Technician
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="email"
                  value={newTechEmail}
                  onChange={(e) => setNewTechEmail(e.target.value)}
                  className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                  placeholder="Email *"
                />
                <input
                  type="text"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                  placeholder="Full Name *"
                />
                <input
                  type="tel"
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-colors"
                  placeholder="Phone (optional)"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAddTechnician}
                  disabled={addingTech}
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-mono text-xs px-4 py-2 rounded-full transition-all disabled:opacity-50"
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
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-mono text-xs px-4 py-2 rounded-full transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Technicians List */}
          {technicians.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <UsersIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                No technicians added yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {technicians.map((tech) => (
                <div 
                  key={tech.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-400/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-xs font-medium text-purple-700 dark:text-purple-300">
                        {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-slate-900 dark:text-white truncate">
                        {tech.full_name || 'Unnamed'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Business ID Card */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase">
              Business ID
            </div>
            <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
              {business.id}
            </code>
          </div>
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 sm:text-right">
            Use this ID to configure your n8n webhook integration
          </p>
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
