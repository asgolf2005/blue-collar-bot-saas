'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle, AlertCircle, TrendingUp, TrendingDown, X } from '@/components/ui/icons'
import { showToast } from '@/lib/utils/toast'

interface SubscriptionData {
  id: string
  tier: 'starter' | 'professional' | 'enterprise'
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

interface SubscriptionManagerProps {
  subscription: SubscriptionData | null
  businessId: string
}

const TIER_INFO = {
  starter: {
    name: 'Starter',
    price: 99,
    features: [
      'Job management',
      'Customer database',
      'Tech mobile app',
      'Customer portal',
      'Invoicing & payments',
      'Basic support',
    ],
  },
  professional: {
    name: 'Professional',
    price: 299,
    features: [
      'Everything in Starter',
      'âœ¨ AI Phone Receptionist',
      'Unlimited AI calls (200/mo)',
      'Priority support',
      'Call recordings & transcripts',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    features: [
      'Everything in Professional',
      'Multi-location support',
      'Custom integrations',
      'API access',
      'Dedicated success manager',
    ],
  },
}

export default function SubscriptionManager({ subscription, businessId }: SubscriptionManagerProps) {
  const [isChangingTier, setIsChangingTier] = useState(false)
  const [selectedTier, setSelectedTier] = useState<keyof typeof TIER_INFO | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const currentTier = subscription?.tier || 'starter'

  const handleUpgrade = (tier: keyof typeof TIER_INFO) => {
    setSelectedTier(tier)
    setIsChangingTier(true)
  }

  const confirmTierChange = async () => {
    if (!selectedTier) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/update-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTier: selectedTier.toUpperCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription')
      }

      showToast.success(data.message || 'Subscription updated successfully!')
      setIsChangingTier(false)
      // Refresh the page to show updated subscription
      window.location.reload()
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create billing portal session')
      }

      // Redirect to Stripe billing portal
      window.location.href = data.url
    } catch (error: any) {
      showToast.error(error.message || 'Failed to open billing portal')
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: SubscriptionData['status']) => {
    const badges = {
      trialing: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, text: 'Trial' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
      past_due: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Past Due' },
      canceled: { color: 'bg-gray-100 text-gray-800', icon: X, text: 'Canceled' },
      unpaid: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, text: 'Unpaid' },
    }

    const badge = badges[status]
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      {subscription && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Current Subscription</h2>
            {getStatusBadge(subscription.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="text-lg font-semibold text-gray-900">
                {TIER_INFO[currentTier].name}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${TIER_INFO[currentTier].price}
                <span className="text-sm font-normal text-gray-500">/month</span>
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Current Period</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Next Billing Date</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
              {subscription.cancel_at_period_end && (
                <p className="text-sm text-red-600 mt-1">Will cancel after this period</p>
              )}
            </div>
          </div>

          <button type="button"
            onClick={handleManageBilling}
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {isLoading ? 'Loading...' : 'Manage Billing'}
          </button>
        </div>
      )}

      {/* Upgrade Options */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(TIER_INFO).map(([tier, info]) => {
            const isCurrentTier = tier === currentTier
            const isUpgrade = TIER_INFO[tier as keyof typeof TIER_INFO].price > TIER_INFO[currentTier].price
            const isDowngrade = TIER_INFO[tier as keyof typeof TIER_INFO].price < TIER_INFO[currentTier].price

            return (
              <div
                key={tier}
                className={`relative bg-white rounded-lg shadow p-6 ${
                  isCurrentTier ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                {tier === 'professional' && !isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  ${info.price}
                  <span className="text-sm font-normal text-gray-500">/month</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {info.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrentTier && (
                  <button type="button"
                    onClick={() => handleUpgrade(tier as keyof typeof TIER_INFO)}
                    className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                      tier === 'professional'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isUpgrade && <TrendingUp className="w-4 h-4" />}
                    {isDowngrade && <TrendingDown className="w-4 h-4" />}
                    {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Select Plan'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isChangingTier && selectedTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Plan Change</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change to the <strong>{TIER_INFO[selectedTier].name}</strong> plan
              (${TIER_INFO[selectedTier].price}/month)?
              {TIER_INFO[selectedTier].price > TIER_INFO[currentTier].price
                ? ' You will be charged a prorated amount for the remainder of this billing period.'
                : ' Your account will be credited for the unused portion of your current plan.'}
            </p>

            <div className="flex gap-3">
              <button type="button"
                onClick={() => setIsChangingTier(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button type="button"
                onClick={confirmTierChange}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

