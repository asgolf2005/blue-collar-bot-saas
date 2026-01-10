'use client'

import { DollarSign, Clock, Package, Receipt } from 'lucide-react'

interface PricingBreakdownProps {
  laborHours?: number | null
  laborRate?: number | null
  partsCost?: number | null
  totalCost?: number | null
  services?: Array<{
    name: string
    price?: number
    quantity?: number
  }>
  taxRate?: number
  isPaid?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export default function PricingBreakdown({
  laborHours,
  laborRate,
  partsCost,
  totalCost,
  services = [],
  taxRate = 0,
  isPaid = false,
  variant = 'default'
}: PricingBreakdownProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const laborTotal = (laborHours || 0) * (laborRate || 0)
  const servicesTotal = services.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0)
  const subtotal = laborTotal + (partsCost || 0) + servicesTotal
  const taxAmount = subtotal * (taxRate / 100)
  const calculatedTotal = totalCost || (subtotal + taxAmount)

  const hasAnyPricing = laborHours || partsCost || totalCost || services.length > 0

  if (!hasAnyPricing) {
    return (
      <div className="card p-6 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Pricing will be available after job completion</p>
      </div>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Cost</span>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(calculatedTotal)}</span>
        </div>
        {isPaid && (
          <div className="mt-2 flex items-center justify-end">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Paid
            </span>
          </div>
        )}
      </div>
    )
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div className="card overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            <Receipt className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Price Breakdown</h3>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Services */}
          {services.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Package className="w-4 h-4 mr-1" />
                Services
              </h4>
              <div className="space-y-2">
                {services.map((service, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {service.name}
                      {(service.quantity || 1) > 1 && ` x${service.quantity}`}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency((service.price || 0) * (service.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Labor */}
          {laborHours && laborRate && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Labor
              </h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {laborHours} hour{laborHours !== 1 ? 's' : ''} @ {formatCurrency(laborRate)}/hr
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(laborTotal)}</span>
              </div>
            </div>
          )}

          {/* Parts */}
          {partsCost && partsCost > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Package className="w-4 h-4 mr-1" />
                Parts & Materials
              </h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Parts and materials</span>
                <span className="font-medium text-gray-900">{formatCurrency(partsCost)}</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 pt-4">
            {/* Subtotal */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
            </div>

            {/* Tax */}
            {taxRate > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Tax ({taxRate}%)</span>
                <span className="font-medium text-gray-700">{formatCurrency(taxAmount)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Total</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(calculatedTotal)}</span>
                {isPaid && (
                  <div className="mt-1">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Paid
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className="card p-6">
      <div className="flex items-center mb-4">
        <DollarSign className="w-5 h-5 text-gray-600 mr-2" />
        <h3 className="font-semibold text-gray-900">Pricing</h3>
      </div>

      <div className="space-y-3">
        {/* Labor */}
        {laborHours && laborRate && (
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Labor</p>
              <p className="text-xs text-gray-500">
                {laborHours} hr × {formatCurrency(laborRate)}
              </p>
            </div>
            <span className="font-medium text-gray-900">{formatCurrency(laborTotal)}</span>
          </div>
        )}

        {/* Parts */}
        {partsCost && partsCost > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Parts & Materials</p>
            </div>
            <span className="font-medium text-gray-900">{formatCurrency(partsCost)}</span>
          </div>
        )}

        {/* Services */}
        {services.map((service, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">{service.name}</p>
              {(service.quantity || 1) > 1 && (
                <p className="text-xs text-gray-500">Qty: {service.quantity}</p>
              )}
            </div>
            <span className="font-medium text-gray-900">
              {formatCurrency((service.price || 0) * (service.quantity || 1))}
            </span>
          </div>
        ))}

        {/* Total */}
        <div className="flex justify-between items-center pt-3">
          <span className="font-bold text-gray-900">Total</span>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">{formatCurrency(calculatedTotal)}</span>
            {isPaid && (
              <div className="mt-1">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Paid
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
