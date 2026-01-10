'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
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
    <button
      onClick={handleSeed}
      disabled={isLoading}
      className="glass-btn-primary"
    >
      <Plus className="w-4 h-4" />
      {isLoading ? 'Reseeding...' : 'Reseed Jobs'}
    </button>
  )
}

{id: '9757f0b4-c10d-4ad3-a434-fe709298a7d0', email: 'melb-tech+d9b72a-3b2eb5-01@demo.com', password: 'T!K17k1XDJRCKP', full_name: 'Demo Tech 01'}
1
: 
{id: 'de7a5a3a-614a-45e2-b056-fce3a6e010d7', email: 'melb-tech+d9b72a-3b2eb5-02@demo.com', password: 'T!FHpPp7dlZToA', full_name: 'Demo Tech 02'}
2
: 
{id: '43d29a6d-f6d9-4a81-a1d0-fcce8429433a', email: 'melb-tech+d9b72a-3b2eb5-03@demo.com', password: 'T!YgyWfgxM6prl', full_name: 'Demo Tech 03'}
3
: 
{id: '9e3110a1-78e2-4fda-9c8c-9ddb7304dfbc', email: 'melb-tech+d9b72a-3b2eb5-04@demo.com', password: 'T!dvROfG5i5rxG', full_name: 'Demo Tech 04'}
4
: 
{id: '0a98b5b8-029b-43fc-a8be-914328e749de', email: 'melb-tech+d9b72a-3b2eb5-05@demo.com', password: 'T!yGNlAcSO25gA', full_name: 'Demo Tech 05'}
5
: 
{id: 'bf2bbaf2-7967-442e-ade8-69f526229975', email: 'melb-tech+d9b72a-3b2eb5-06@demo.com', password: 'T!rDK6HHvZotJ3', full_name: 'Demo Tech 06'}
length
: 
6
[[Prototype]]
: 
Array(0)
[[Prototype]]
: 
Object
