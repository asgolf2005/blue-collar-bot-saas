/**
 * Utility function to conditionally join class names
 * Similar to clsx/classnames but lightweight
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}
