import type { Job, JobExpense, ProfitMetrics, ExpenseBreakdown } from '@/lib/types'

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, includeCents: boolean = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0,
  }).format(amount)
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  return ((revenue - cost) / revenue) * 100
}

/**
 * Get color class based on profit margin
 */
export function getProfitColor(profitMargin: number): string {
  if (profitMargin >= 30) return 'text-success'
  if (profitMargin >= 15) return 'text-primary'
  if (profitMargin >= 0) return 'text-warning'
  return 'text-danger'
}

/**
 * Get background color class based on profit margin
 */
export function getProfitBgColor(profitMargin: number): string {
  if (profitMargin >= 30) return 'bg-success/10'
  if (profitMargin >= 15) return 'bg-primary/10'
  if (profitMargin >= 0) return 'bg-warning/10'
  return 'bg-danger/10'
}

/**
 * Get border color class based on profit margin
 */
export function getProfitBorderColor(profitMargin: number): string {
  if (profitMargin >= 30) return 'border-success/20'
  if (profitMargin >= 15) return 'border-primary/20'
  if (profitMargin >= 0) return 'border-warning/20'
  return 'border-danger/20'
}

/**
 * Get profit status label
 */
export function getProfitStatus(profitMargin: number): string {
  if (profitMargin >= 30) return 'Excellent'
  if (profitMargin >= 15) return 'Good'
  if (profitMargin >= 0) return 'Low'
  return 'Loss'
}

/**
 * Calculate expense breakdown by category
 */
export function calculateExpenseBreakdown(expenses: JobExpense[]): ExpenseBreakdown {
  const breakdown: ExpenseBreakdown = {
    labor: 0,
    materials: 0,
    subcontractor: 0,
    equipment_rental: 0,
    travel: 0,
    permits: 0,
    other: 0,
    total: 0,
  }

  expenses.forEach(expense => {
    const amount = expense.amount
    breakdown.total += amount

    switch (expense.category) {
      case 'materials':
        breakdown.materials += amount
        break
      case 'subcontractor':
        breakdown.subcontractor += amount
        break
      case 'equipment_rental':
        breakdown.equipment_rental += amount
        break
      case 'travel':
        breakdown.travel += amount
        break
      case 'permits':
        breakdown.permits += amount
        break
      case 'other':
        breakdown.other += amount
        break
    }
  })

  return breakdown
}

/**
 * Calculate comprehensive profit metrics for a job
 */
export function calculateJobProfitMetrics(job: Job): ProfitMetrics {
  const revenue = job.total_cost || 0 // total_cost is actually revenue (should rename in future)
  const estimated_total =
    (job.estimated_labor_hours || 0) * (job.labor_rate || 0) +
    (job.estimated_materials_cost || 0) +
    (job.estimated_other_costs || 0)

  const actual_total =
    (job.actual_labor_cost || 0) +
    (job.actual_materials_cost || 0) +
    (job.actual_other_costs || 0)

  const gross_profit = revenue - actual_total
  const profit_margin = calculateProfitMargin(revenue, actual_total)

  const cost_variance = actual_total - estimated_total
  const cost_variance_percentage =
    estimated_total > 0 ? (cost_variance / estimated_total) * 100 : 0

  return {
    estimated_total,
    actual_total,
    gross_profit,
    profit_margin,
    cost_variance,
    cost_variance_percentage,
  }
}

/**
 * Format expense category for display
 */
export function formatExpenseCategory(category: string): string {
  const labels: Record<string, string> = {
    materials: 'Materials',
    subcontractor: 'Subcontractor',
    equipment_rental: 'Equipment Rental',
    travel: 'Travel',
    permits: 'Permits',
    other: 'Other',
  }
  return labels[category] || category
}

/**
 * Get expense category icon (using lucide-react icon names)
 */
export function getExpenseCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    materials: 'Package',
    subcontractor: 'Users',
    equipment_rental: 'Wrench',
    travel: 'Car',
    permits: 'FileText',
    other: 'Receipt',
  }
  return icons[category] || 'Receipt'
}

/**
 * Get expense category color
 */
export function getExpenseCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    materials: 'text-blue-600',
    subcontractor: 'text-purple-600',
    equipment_rental: 'text-orange-600',
    travel: 'text-green-600',
    permits: 'text-yellow-600',
    other: 'text-gray-600',
  }
  return colors[category] || 'text-gray-600'
}

/**
 * Calculate total actual costs from job fields
 */
export function getTotalActualCost(job: Job): number {
  return (
    (job.actual_labor_cost || 0) +
    (job.actual_materials_cost || 0) +
    (job.actual_other_costs || 0)
  )
}

/**
 * Calculate total estimated costs from job fields
 */
export function getTotalEstimatedCost(job: Job): number {
  return (
    (job.estimated_labor_hours || 0) * (job.labor_rate || 0) +
    (job.estimated_materials_cost || 0) +
    (job.estimated_other_costs || 0)
  )
}

/**
 * Check if job is over budget
 */
export function isJobOverBudget(job: Job): boolean {
  const estimated = getTotalEstimatedCost(job)
  const actual = getTotalActualCost(job)
  return actual > estimated
}

/**
 * Calculate budget variance amount
 */
export function getBudgetVariance(job: Job): number {
  const estimated = getTotalEstimatedCost(job)
  const actual = getTotalActualCost(job)
  return actual - estimated
}

/**
 * Calculate budget variance percentage
 */
export function getBudgetVariancePercentage(job: Job): number {
  const estimated = getTotalEstimatedCost(job)
  const variance = getBudgetVariance(job)
  return estimated > 0 ? (variance / estimated) * 100 : 0
}
