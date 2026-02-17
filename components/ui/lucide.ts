// Server-safe Lucide re-exports.
// `components/ui/icons.tsx` imports Phosphor which uses React context and can break in RSC/server builds.
export * from 'lucide-react'
export type { LucideIcon, LucideProps } from 'lucide-react'

