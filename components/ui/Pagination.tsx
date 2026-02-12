'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      {/* Results Text - High Contrast */}
      <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
        Showing <span className="font-bold text-slate-900 dark:text-white">{startItem}</span> to{' '}
        <span className="font-bold text-slate-900 dark:text-white">{endItem}</span> of{' '}
        <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 
                     bg-white dark:bg-slate-800
                     text-slate-900 dark:text-white
                     hover:bg-slate-100 dark:hover:bg-slate-700 
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     transition-colors flex items-center justify-center"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span 
                  key={`ellipsis-${index}`} 
                  className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-sm"
                >
                  ...
                </span>
              )
            }

            const isCurrentPage = currentPage === page

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 rounded-lg font-mono text-sm font-medium transition-all
                  ${isCurrentPage
                    ? 'bg-blue-600 dark:bg-cyan-500 text-white font-bold shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                {page}
              </button>
            )
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 
                     bg-white dark:bg-slate-800
                     text-slate-900 dark:text-white
                     hover:bg-slate-100 dark:hover:bg-slate-700 
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     transition-colors flex items-center justify-center"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
