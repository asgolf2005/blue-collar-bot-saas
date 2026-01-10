'use client'

import { Business, User } from '@/lib/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users as UsersIcon, Building2, UserPlus, Trash2, Save, Phone, Mail, MessageSquare, Bell } from 'lucide-react'
import AddressAutocomplete from '@/components/common/AddressAutocomplete'
import { useRouter } from 'next/navigation'

export default function SettingsForm({
  business,
  technicians
}: {
  business: Business
  technicians: User[]
}) {
  const router = useRouter()
  const supabase = createClient()

  // Business settings state
  const [name, setName] = useState(business.name)
  const [address, setAddress] = useState(business.address || '')
  const [email, setEmail] = useState(business.email || '')
  const [phone, setPhone] = useState(business.phone || '')
  const [calendarId, setCalendarId] = useState(business.primary_calendar_id || '')
  const [saving, setSaving] = useState(false)

  // SMS settings state
  const [smsEnabled, setSmsEnabled] = useState(business.sms_enabled || false)
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

  const handleSave = async (e: React.FormEvent) => {
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
          sms_enabled: smsEnabled,
          sms_notifications: smsNotifications,
        })
        .eq('id', business.id)

      if (error) throw error

      alert('Settings saved successfully')
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <form onSubmit={handleSave} className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Business Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Business Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Business Address</label>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, Sydney NSW 2000"
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="info@yourbusiness.com"
                />
              </div>

              <div>
                <label className="label">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="0412 345 678"
                />
              </div>
            </div>

            <div>
              <label className="label">Google Calendar ID</label>
              <input
                type="text"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="input"
                placeholder="your-calendar-id@group.calendar.google.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used by the AI receptionist to check availability and create events
              </p>
            </div>

            {/* SMS Notifications Section */}
            <div className="pt-6 mt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">SMS Notifications</h3>
                    <p className="text-xs text-gray-500">Automatically notify customers via text message</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {smsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {smsEnabled && (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800 flex items-start gap-2">
                      <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Setup Required:</strong> Add your Twilio credentials to environment variables:
                        <code className="block mt-1 text-xs bg-yellow-100 p-2 rounded">
                          TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                        </code>
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Notification Types:</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(smsNotifications).map(([key, value]) => (
                        <label
                          key={key}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        >
                          <span className="text-sm text-gray-700">
                            {key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())}
                          </span>
                          <input
                            type="checkbox"
                            checked={value as boolean}
                            onChange={() => handleSmsNotificationToggle(key)}
                            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="lg:col-span-1">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <UsersIcon className="w-5 h-5 mr-2" />
              Technicians ({technicians.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowAddTech(!showAddTech)}
              className="btn btn-secondary text-sm"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Add
            </button>
          </div>

          {showAddTech && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Add Technician</h4>
              <div className="space-y-2">
                <input
                  type="email"
                  value={newTechEmail}
                  onChange={(e) => setNewTechEmail(e.target.value)}
                  className="input text-sm"
                  placeholder="Email *"
                />
                <input
                  type="text"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  className="input text-sm"
                  placeholder="Full Name *"
                />
                <input
                  type="tel"
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  className="input text-sm"
                  placeholder="Phone (optional)"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddTechnician}
                    disabled={addingTech}
                    className="btn btn-primary text-sm flex-1"
                  >
                    {addingTech ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTech(false)
                      setNewTechEmail('')
                      setNewTechName('')
                      setNewTechPhone('')
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {technicians.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No technicians added yet</p>
          ) : (
            <div className="space-y-2">
              {technicians.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-green-800">
                        {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{tech.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-600 truncate">{tech.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTech(tech.id, tech.full_name || tech.email)}
                    className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition flex-shrink-0"
                    title="Remove technician"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Business ID</h3>
          <code className="text-xs bg-gray-100 p-2 rounded block break-all">
            {business.id}
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Use this ID to configure your n8n webhook integration
          </p>
        </div>
      </div>
    </div>
  )
}
