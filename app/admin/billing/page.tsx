'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { 
  CreditCard,
  Receipt,
  Download,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Building2,
  Calendar,
  AlertCircle,
  Edit3,
  Plus,
  Trash2,
  ChevronRight
} from '@/components/ui/icons'
import { format } from 'date-fns'

// Types
interface PaymentMethod {
  id: string
  type: 'card'
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface Invoice {
  id: string
  number: string
  amount: number
  status: 'paid' | 'open' | 'void'
  date: string
  description: string
}

interface Subscription {
  plan: string
  status: 'active' | 'cancelled' | 'past_due'
  currentPeriodStart: string
  currentPeriodEnd: string
  amount: number
  interval: 'month' | 'year'
}

// Mock data
const mockSubscription: Subscription = {
  plan: 'Pro',
  status: 'active',
  currentPeriodStart: '2024-01-01',
  currentPeriodEnd: '2024-02-01',
  amount: 79,
  interval: 'month'
}

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2026,
    isDefault: true
  },
  {
    id: '2',
    type: 'card',
    brand: 'mastercard',
    last4: '8888',
    expMonth: 8,
    expYear: 2025,
    isDefault: false
  }
]

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'SUB-001',
    amount: 79,
    status: 'paid',
    date: '2024-01-01',
    description: 'Pro Plan - Monthly'
  },
  {
    id: '2',
    number: 'SUB-002',
    amount: 79,
    status: 'paid',
    date: '2023-12-01',
    description: 'Pro Plan - Monthly'
  },
  {
    id: '3',
    number: 'SUB-003',
    amount: 79,
    status: 'paid',
    date: '2023-11-01',
    description: 'Pro Plan - Monthly'
  }
]

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    interval: 'month',
    description: 'For small teams getting started',
    features: [
      'Up to 5 technicians',
      '100 jobs/month',
      'Basic reporting',
      'Email support'
    ],
    cta: 'Downgrade',
    current: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    interval: 'month',
    description: 'For growing businesses',
    features: [
      'Unlimited technicians',
      'Unlimited jobs',
      'Advanced analytics',
      'Priority support',
      'SMS notifications',
      'Customer portal'
    ],
    cta: 'Current Plan',
    current: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Advanced security',
      'White-label options'
    ],
    cta: 'Upgrade',
    current: false
  }
]

export default function BillingPage() {
  const [subscription, setSubscription] = useState(mockSubscription)
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods)
  const [showAddCard, setShowAddCard] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  // Calculate next billing date
  const nextBillingDate = format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')

  // Format current date
  const now = new Date()
  const sysTime = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase().replace(/,/g, '')

  const setDefaultPaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(pm => ({
      ...pm,
      isDefault: pm.id === id
    })))
  }

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            BILLING
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime}
          </p>
        </div>
      </div>

      {/* Subscription Status Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-cyan-600 dark:to-cyan-700 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-mono text-xs uppercase tracking-wider opacity-80">Current Plan</span>
              </div>
              <h2 className="font-display text-4xl">{subscription.plan}</h2>
              <p className="font-mono text-sm opacity-80 mt-1">
                ${subscription.amount}/{subscription.interval}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-wider">{subscription.status}</span>
                </div>
                <p className="font-mono text-xs opacity-70 mt-1">
                  Next billing: {nextBillingDate}
                </p>
              </div>
              <button className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 font-mono text-xs transition-colors">
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-400/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
                  PAYMENT METHODS
                </h2>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">
                  {paymentMethods.length} {paymentMethods.length === 1 ? 'card' : 'cards'} saved
                </p>
              </div>
            </div>
            <button type="button"
              onClick={() => setShowAddCard(!showAddCard)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {/* Add Card Form */}
            {showAddCard && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-fade-in">
                <h3 className="font-mono text-xs text-slate-900 dark:text-white font-medium mb-3">
                  Add New Card
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Card number"
                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-4 py-2 rounded-full transition-colors">
                      Add Card
                    </button>
                    <button type="button" 
                      onClick={() => setShowAddCard(false)}
                      className="px-4 py-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method List */}
            {paymentMethods.map((method) => (
              <div 
                key={method.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  method.isDefault 
                    ? 'bg-blue-50 dark:bg-blue-400/5 border-blue-200 dark:border-blue-400/20' 
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    method.brand === 'visa' 
                      ? 'bg-blue-100 dark:bg-blue-400/20' 
                      : 'bg-orange-100 dark:bg-orange-400/20'
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      method.brand === 'visa'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-900 dark:text-white capitalize">
                        {method.brand}
                      </span>
                      <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                        â€¢â€¢â€¢â€¢ {method.last4}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault ? (
                    <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 font-mono text-[10px]">
                      Default
                    </span>
                  ) : (
                    <button type="button"
                      onClick={() => setDefaultPaymentMethod(method.id)}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button"
                    onClick={() => removePaymentMethod(method.id)}
                    className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-400/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {paymentMethods.length === 0 && (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  No payment methods saved
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-400/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
                  INVOICE HISTORY
                </h2>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">
                  {mockInvoices.length} invoices
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-3">
              {mockInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-400/10 flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="font-mono text-sm text-slate-900 dark:text-white">
                        {invoice.number}
                      </span>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {invoice.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                        ${invoice.amount}
                      </span>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {format(new Date(invoice.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              View all invoices
            </button>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-2xl text-slate-900 dark:text-white tracking-wide">
            PLANS
          </h2>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Upgrade or downgrade anytime
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.current 
                  ? 'bg-blue-50 dark:bg-blue-400/5 border-blue-500 dark:border-cyan-500 ring-1 ring-blue-500 dark:ring-cyan-500' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-blue-600 dark:bg-cyan-500 text-white font-mono text-[10px]">
                    Current
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="font-display text-2xl text-slate-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span className="font-display text-4xl text-slate-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                    /{plan.interval}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <Check className={`w-4 h-4 ${plan.current ? 'text-blue-600 dark:text-cyan-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button 
                disabled={plan.current}
                className={`w-full py-3 rounded-full font-mono text-xs transition-colors ${
                  plan.current 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default' 
                    : plan.id === 'enterprise'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                      : 'bg-blue-600 dark:bg-cyan-500 text-white hover:bg-blue-700 dark:hover:bg-cyan-400'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">
            BILLING SETTINGS
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-400/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <span className="font-mono text-sm text-slate-900 dark:text-white">
                  Billing Alerts
                </span>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  Get notified before your card is charged
                </p>
              </div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-400/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <span className="font-mono text-sm text-slate-900 dark:text-white">
                  Auto-Renewal
                </span>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  Automatically renew subscription
                </p>
              </div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Toggle Component
function Toggle({ 
  checked, 
  onChange 
}: { 
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-cyan-400/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-cyan-500" />
    </label>
  )
}

