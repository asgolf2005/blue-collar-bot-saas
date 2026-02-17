'use client'

import { useState } from 'react'
import { Plus } from '@/components/ui/icons'
import { showToast } from '@/lib/utils/toast'

export default function SeedButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSeed = async () => {
    if (!confirm('This will delete existing jobs and create 500 new jobs from Dec 1, 2025 through Dec 31, 2026 with invoices. Continue?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/seed-jobs', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed jobs')
      }

      showToast.success(data.message || 'Jobs re-seeded successfully!')

      // Refresh the page to show new data
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to create sample jobs')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button type="button"
      onClick={handleSeed}
      disabled={isLoading}
      className="glass-btn-primary"
    >
      <Plus className="w-4 h-4" />
      {isLoading ? 'Reseeding...' : 'Reseed Jobs'}
    </button>
  )
}

