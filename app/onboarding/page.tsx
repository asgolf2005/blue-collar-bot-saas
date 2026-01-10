'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wrench, Building, Briefcase, Check } from 'lucide-react'
import AddressAutocomplete from '@/components/common/AddressAutocomplete'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Business info
  const [address, setAddress] = useState('')
  const [calendarId, setCalendarId] = useState('')

  // Services
  const [services, setServices] = useState([
    { name: '', base_price: '', duration_minutes: '60' },
  ])

  // IDs we'll need
  const [businessId, setBusinessId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const checkOnboardingData = async () => {
      // Get data from signup
      const onboardingData = localStorage.getItem('onboarding_data')
      if (!onboardingData) {
        // No onboarding data - user may have stale session
        // Sign them out and redirect to login
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      const data = JSON.parse(onboardingData)
      setUserId(data.user_id)
    }

    checkOnboardingData()
  }, [router, supabase.auth])

  const handleStep1 = async () => {
    setLoading(true)
    setError(null)

    try {
      const onboardingData = localStorage.getItem('onboarding_data')
      if (!onboardingData) throw new Error('Missing signup data')

      const data = JSON.parse(onboardingData)

      // Call API route to create business, user profile, and subscription
      const response = await fetch('/api/onboarding/complete-step-1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: data.user_id,
          business_name: data.business_name,
          owner_name: data.owner_name,
          email: data.email,
          phone: data.phone,
          address,
          calendar_id: calendarId || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding')
      }

      setBusinessId(result.business_id)
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addService = () => {
    setServices([...services, { name: '', base_price: '', duration_minutes: '60' }])
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const updateService = (index: number, field: string, value: string) => {
    const updated = [...services]
    updated[index] = { ...updated[index], [field]: value }
    setServices(updated)
  }

  const handleStep2 = async () => {
    setLoading(true)
    setError(null)

    try {
      // Filter out empty services
      const validServices = services.filter(s => s.name && s.base_price)

      if (validServices.length === 0) {
        throw new Error('Please add at least one service')
      }

      // Insert services
      const servicesToInsert = validServices.map(s => ({
        business_id: businessId,
        name: s.name,
        base_price: parseFloat(s.base_price),
        duration_minutes: parseInt(s.duration_minutes),
        is_active: true,
      }))

      const { error: servicesError } = await supabase
        .from('services')
        .insert(servicesToInsert)

      if (servicesError) throw servicesError

      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      // Mark onboarding as completed via API
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding')
      }

      // Clear onboarding data
      localStorage.removeItem('onboarding_data')

      // Redirect to dashboard
      router.push('/admin/jobs')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                {step > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:block">Business</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                {step > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:block">Services</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                {step > 3 ? <Check className="w-5 h-5" /> : '3'}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:block">Done</span>
            </div>
          </div>
        </div>

        <div className="card">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div>
              <div className="flex items-center mb-6">
                <Building className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Business Address</label>
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    placeholder="123 Main Street, Sydney, NSW 2000"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Google Calendar ID (Optional)</label>
                  <input
                    type="text"
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                    placeholder="your-calendar@group.calendar.google.com"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used by AI receptionist to manage appointments
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleStep1}
                  disabled={loading || !address}
                  className="btn btn-primary w-full"
                >
                  {loading ? 'Setting up...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {step === 2 && (
            <div>
              <div className="flex items-center mb-6">
                <Briefcase className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Your Services</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Add the services you offer. You can add more later.
              </p>

              <div className="space-y-4 mb-6">
                {services.map((service, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        placeholder="Service name (e.g., Blocked Drain)"
                        className="input mb-2"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={service.base_price}
                          onChange={(e) => updateService(index, 'base_price', e.target.value)}
                          placeholder="Price"
                          className="input w-1/2"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={service.duration_minutes}
                          onChange={(e) => updateService(index, 'duration_minutes', e.target.value)}
                          placeholder="Duration (mins)"
                          className="input w-1/2"
                        />
                      </div>
                    </div>
                    {services.length > 1 && (
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-700 mt-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addService}
                className="btn btn-secondary w-full mb-4"
              >
                + Add Another Service
              </button>

              {error && (
                <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleStep2}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
              <p className="text-gray-600 mb-8">
                Your account is ready. Start managing your jobs and growing your business.
              </p>

              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn btn-primary px-8"
              >
                {loading ? 'Loading...' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
