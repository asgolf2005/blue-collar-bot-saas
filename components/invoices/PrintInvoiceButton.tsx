'use client'

import { ReactNode } from 'react'

export default function PrintInvoiceButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors print:hidden"
    >
      {children}
    </button>
  )
}
