/**
 * Unified Icon System for Blue Collar Bot
 * Combines Lucide Icons (primary) + Phosphor Icons (extended variety)
 * 
 * Usage:
 *   import { Icon } from '@/components/ui/icons'
 *   <Icon name="settings" size="md" />
 *   <Icon icon={Gear} weight="duotone" />
 * 
 * Guidelines:
 * - Use Lucide icons for standard UI (clean, minimal outline style)
 * - Use Phosphor icons when you need: fill variants, duotone, or different weights
 * - Always use the <Icon /> wrapper for consistent sizing and styling
 */

import React from 'react'
import * as LucideIcons from 'lucide-react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ========================================
// TYPES
// ========================================

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

export interface IconProps {
  /** Icon component (from Lucide or Phosphor) or icon name */
  icon?: React.ComponentType<any> | React.ElementType
  name?: keyof typeof iconRegistry
  /** Predefined sizes: xs(12), sm(16), md(20), lg(24), xl(32) */
  size?: IconSize
  /** Phosphor weight variants */
  weight?: IconWeight
  /** Icon color - uses CSS variables by default */
  color?: string
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
  /** Accessible label */
  ariaLabel?: string
}

// ========================================
// SIZE MAPPINGS
// ========================================

const sizeMap: Record<string, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

// ========================================
// ICON REGISTRY - Common Icons
// Maps string names to actual icon components
// ========================================

export const iconRegistry = {
  // Navigation & Layout
  home: LucideIcons.Home,
  dashboard: LucideIcons.LayoutDashboard,
  menu: LucideIcons.Menu,
  close: LucideIcons.X,
  back: LucideIcons.ArrowLeft,
  forward: LucideIcons.ArrowRight,
  up: LucideIcons.ArrowUp,
  down: LucideIcons.ArrowDown,
  chevronLeft: LucideIcons.ChevronLeft,
  chevronRight: LucideIcons.ChevronRight,
  chevronUp: LucideIcons.ChevronUp,
  chevronDown: LucideIcons.ChevronDown,
  
  // Actions
  add: LucideIcons.Plus,
  plus: LucideIcons.Plus,
  edit: LucideIcons.Pencil,
  pencil: LucideIcons.Pencil,
  delete: LucideIcons.Trash2,
  trash: LucideIcons.Trash2,
  save: LucideIcons.Save,
  cancel: LucideIcons.X,
  check: LucideIcons.Check,
  checkCircle: LucideIcons.CheckCircle,
  checkCircle2: LucideIcons.CheckCircle2,
  refresh: LucideIcons.RefreshCw,
  sync: LucideIcons.RefreshCw,
  search: LucideIcons.Search,
  filter: LucideIcons.Filter,
  sort: LucideIcons.ArrowUpDown,
  more: LucideIcons.MoreHorizontal,
  moreVertical: LucideIcons.MoreVertical,
  
  // Communication
  email: LucideIcons.Mail,
  mail: LucideIcons.Mail,
  phone: LucideIcons.Phone,
  message: LucideIcons.MessageSquare,
  chat: LucideIcons.MessageCircle,
  notification: LucideIcons.Bell,
  bell: LucideIcons.Bell,
  bellOff: LucideIcons.BellOff,
  
  // Users & People
  user: LucideIcons.User,
  users: LucideIcons.Users,
  userAdd: LucideIcons.UserPlus,
  userRemove: LucideIcons.UserMinus,
  profile: LucideIcons.UserCircle,
  customer: LucideIcons.User,
  technician: LucideIcons.HardHat,
  
  // Business & Jobs
  job: LucideIcons.Briefcase,
  jobs: LucideIcons.Briefcase,
  briefcase: LucideIcons.Briefcase,
  calendar: LucideIcons.Calendar,
  schedule: LucideIcons.CalendarDays,
  time: LucideIcons.Clock,
  clock: LucideIcons.Clock,
  location: LucideIcons.MapPin,
  mapPin: LucideIcons.MapPin,
  address: LucideIcons.MapPin,
  building: LucideIcons.Building2,
  business: LucideIcons.Building2,
  company: LucideIcons.Building2,
  
  // Services & Work
  service: LucideIcons.Wrench,
  services: LucideIcons.Wrench,
  wrench: LucideIcons.Wrench,
  tools: LucideIcons.Wrench,
  tool: LucideIcons.Wrench,
  settings: LucideIcons.Settings,
  gear: LucideIcons.Settings,
  
  // Money & Invoicing
  invoice: LucideIcons.Receipt,
  receipt: LucideIcons.Receipt,
  payment: LucideIcons.CreditCard,
  creditCard: LucideIcons.CreditCard,
  money: LucideIcons.DollarSign,
  dollar: LucideIcons.DollarSign,
  billing: LucideIcons.Receipt,
  
  // Analytics & Data
  analytics: LucideIcons.BarChart3,
  chart: LucideIcons.BarChart3,
  stats: LucideIcons.BarChart2,
  statistics: LucideIcons.BarChart2,
  trendUp: LucideIcons.TrendingUp,
  trendDown: LucideIcons.TrendingDown,
  report: LucideIcons.FileBarChart,
  
  // Status & Indicators
  success: LucideIcons.CheckCircle2,
  error: LucideIcons.XCircle,
  warning: LucideIcons.AlertTriangle,
  alert: LucideIcons.AlertCircle,
  info: LucideIcons.Info,
  help: LucideIcons.HelpCircle,
  question: LucideIcons.HelpCircle,
  loading: LucideIcons.Loader2,
  spinner: LucideIcons.Loader2,
  
  // Files & Media
  file: LucideIcons.File,
  fileText: LucideIcons.FileText,
  document: LucideIcons.FileText,
  download: LucideIcons.Download,
  upload: LucideIcons.Upload,
  image: LucideIcons.Image,
  photo: LucideIcons.Image,
  camera: LucideIcons.Camera,
  video: LucideIcons.Video,
  folder: LucideIcons.Folder,
  
  // Misc
  star: LucideIcons.Star,
  heart: LucideIcons.Heart,
  bookmark: LucideIcons.Bookmark,
  tag: LucideIcons.Tag,
  tags: LucideIcons.Tags,
  link: LucideIcons.Link,
  externalLink: LucideIcons.ExternalLink,
  share: LucideIcons.Share2,
  print: LucideIcons.Printer,
  copy: LucideIcons.Copy,
  clipboard: LucideIcons.Clipboard,
  clipboardCheck: LucideIcons.ClipboardCheck,
  sun: LucideIcons.Sun,
  moon: LucideIcons.Moon,
  logout: LucideIcons.LogOut,
  logOut: LucideIcons.LogOut,
  login: LucideIcons.LogIn,
  logIn: LucideIcons.LogIn,
  lock: LucideIcons.Lock,
  unlock: LucideIcons.Unlock,
  eye: LucideIcons.Eye,
  eyeOff: LucideIcons.EyeOff,
  
  // Transportation (for field service)
  truck: LucideIcons.Truck,
  van: LucideIcons.Truck,
  car: LucideIcons.Car,
  navigation: LucideIcons.Navigation,
  map: LucideIcons.Map,
  
  // Mobile/Field specific
  smartphone: LucideIcons.Smartphone,
  mobile: LucideIcons.Smartphone,
  tablet: LucideIcons.Tablet,
  desktop: LucideIcons.Monitor,
  computer: LucideIcons.Monitor,
  
  // Phosphor-specific icons (for extended variety)
  // These provide duotone and fill options Lucide doesn't have
  phosphorHome: PhosphorIcons.House,
  phosphorDashboard: PhosphorIcons.SquaresFour,
  phosphorSettings: PhosphorIcons.Gear,
  phosphorGear: PhosphorIcons.Gear,
  phosphorUser: PhosphorIcons.User,
  phosphorUsers: PhosphorIcons.Users,
  phosphorBell: PhosphorIcons.Bell,
  phosphorNotification: PhosphorIcons.Bell,
  phosphorCalendar: PhosphorIcons.Calendar,
  phosphorChart: PhosphorIcons.ChartLineUp,
  phosphorAnalytics: PhosphorIcons.ChartLineUp,
  phosphorMoney: PhosphorIcons.CurrencyDollar,
  phosphorDollar: PhosphorIcons.CurrencyDollar,
  phosphorWrench: PhosphorIcons.Wrench,
  phosphorTools: PhosphorIcons.Wrench,
  phosphorMapPin: PhosphorIcons.MapPin,
  phosphorLocation: PhosphorIcons.MapPin,
  phosphorBriefcase: PhosphorIcons.Briefcase,
  phosphorJob: PhosphorIcons.Briefcase,
  phosphorCheck: PhosphorIcons.Check,
  phosphorCheckCircle: PhosphorIcons.CheckCircle,
  phosphorX: PhosphorIcons.X,
  phosphorClose: PhosphorIcons.X,
  phosphorTrash: PhosphorIcons.Trash,
  phosphorDelete: PhosphorIcons.Trash,
  phosphorEdit: PhosphorIcons.PencilSimple,
  phosphorPencil: PhosphorIcons.PencilSimple,
  phosphorPlus: PhosphorIcons.Plus,
  phosphorAdd: PhosphorIcons.Plus,
  phosphorSearch: PhosphorIcons.MagnifyingGlass,
  phosphorFilter: PhosphorIcons.Faders,
  phosphorMore: PhosphorIcons.DotsThree,
  phosphorMenu: PhosphorIcons.List,
  phosphorSun: PhosphorIcons.Sun,
  phosphorMoon: PhosphorIcons.Moon,
  phosphorPhone: PhosphorIcons.Phone,
  phosphorMail: PhosphorIcons.Envelope,
  phosphorEmail: PhosphorIcons.Envelope,
  phosphorMessage: PhosphorIcons.ChatCircleText,
  phosphorChat: PhosphorIcons.ChatCircle,
  phosphorFile: PhosphorIcons.File,
  phosphorDocument: PhosphorIcons.FileText,
  phosphorDownload: PhosphorIcons.Download,
  phosphorUpload: PhosphorIcons.Upload,
  phosphorCamera: PhosphorIcons.Camera,
  phosphorImage: PhosphorIcons.Image,
  phosphorPhoto: PhosphorIcons.Image,
  phosphorVideo: PhosphorIcons.VideoCamera,
  phosphorPrinter: PhosphorIcons.Printer,
  phosphorPrint: PhosphorIcons.Printer,
  phosphorShare: PhosphorIcons.ShareNetwork,
  phosphorLink: PhosphorIcons.Link,
  phosphorExternalLink: PhosphorIcons.ArrowSquareOut,
  phosphorCopy: PhosphorIcons.Copy,
  phosphorClipboard: PhosphorIcons.ClipboardText,
  phosphorLock: PhosphorIcons.LockKey,
  phosphorUnlock: PhosphorIcons.LockKeyOpen,
  phosphorEye: PhosphorIcons.Eye,
  phosphorEyeOff: PhosphorIcons.EyeSlash,
  phosphorStar: PhosphorIcons.Star,
  phosphorHeart: PhosphorIcons.Heart,
  phosphorBookmark: PhosphorIcons.Bookmark,
  phosphorTag: PhosphorIcons.Tag,
  phosphorFlag: PhosphorIcons.Flag,
  phosphorClock: PhosphorIcons.Clock,
  phosphorTime: PhosphorIcons.Clock,
  phosphorTimer: PhosphorIcons.Timer,
  phosphorAlert: PhosphorIcons.WarningCircle,
  phosphorWarning: PhosphorIcons.Warning,
  phosphorInfo: PhosphorIcons.Info,
  phosphorQuestion: PhosphorIcons.Question,
  phosphorHelp: PhosphorIcons.Question,
  phosphorLogout: PhosphorIcons.SignOut,
  phosphorLogin: PhosphorIcons.SignIn,
  phosphorArrowLeft: PhosphorIcons.ArrowLeft,
  phosphorArrowRight: PhosphorIcons.ArrowRight,
  phosphorArrowUp: PhosphorIcons.ArrowUp,
  phosphorArrowDown: PhosphorIcons.ArrowDown,
  phosphorChevronLeft: PhosphorIcons.CaretLeft,
  phosphorChevronRight: PhosphorIcons.CaretRight,
  phosphorChevronUp: PhosphorIcons.CaretUp,
  phosphorChevronDown: PhosphorIcons.CaretDown,
} as const

// ========================================
// UNIFIED ICON COMPONENT
// ========================================

export function Icon({
  icon,
  name,
  size = 'md',
  weight = 'regular',
  color,
  className,
  onClick,
  ariaLabel,
}: IconProps) {
  // Determine icon size
  const iconSize = typeof size === 'number' ? size : sizeMap[size] || 20
  
  // Get icon component from registry if name provided
  const IconComponent = name ? iconRegistry[name] : icon
  
  if (!IconComponent) {
    console.warn(`Icon not found: ${name || 'undefined'}`)
    return null
  }

  // Check if it's a Phosphor icon (has weight prop)
  const isPhosphorIcon = name?.startsWith('phosphor') || 
    Object.values(PhosphorIcons).includes(IconComponent as any)

  // Common styles
  const commonClasses = cn(
    'inline-flex items-center justify-center shrink-0',
    onClick && 'cursor-pointer',
    className
  )

  // Render Phosphor icon with weight support
  if (isPhosphorIcon) {
    const PhosphorIcon = IconComponent as React.ComponentType<PhosphorIcons.IconProps>
    return (
      <PhosphorIcon
        size={iconSize}
        weight={weight}
        color={color}
        className={commonClasses}
        onClick={onClick}
        aria-label={ariaLabel}
      />
    )
  }

  // Render Lucide icon
  const LucideIcon = IconComponent as React.ComponentType<LucideIcons.LucideProps>
  return (
    <LucideIcon
      size={iconSize}
      color={color}
      className={commonClasses}
      onClick={onClick}
      aria-label={ariaLabel}
    />
  )
}

// ========================================
// ICON BUTTON COMPONENT
// For interactive icon buttons
// ========================================

export interface IconButtonProps extends IconProps {
  variant?: 'ghost' | 'subtle' | 'filled'
  disabled?: boolean
  title?: string
}

export function IconButton({
  variant = 'ghost',
  disabled,
  title,
  className,
  ...iconProps
}: IconButtonProps) {
  const variantClasses = {
    ghost: 'hover:bg-white/10 active:bg-white/20',
    subtle: 'bg-white/5 hover:bg-white/10 active:bg-white/20',
    filled: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 active:bg-cyan-500/40',
  }

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={iconProps.onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-cyan-400/50',
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{ width: typeof iconProps.size === 'number' ? iconProps.size + 16 : 40 }}
      aria-label={iconProps.ariaLabel || title}
    >
      <Icon {...iconProps} />
    </button>
  )
}

// ========================================
// DIRECT EXPORTS
// Export both libraries for direct use when needed
// ========================================

// Re-export all Lucide icons
export * from 'lucide-react'

// Re-export all Phosphor icons with 'Ph' prefix to avoid naming conflicts
export {
  // Core Phosphor components
  PhosphorIcons as Ph,
}

// Export specific commonly used Phosphor icons with aliases
export {
  House as PhHouse,
  Gear as PhGear,
  User as PhUser,
  Users as PhUsers,
  Bell as PhBell,
  Calendar as PhCalendar,
  ChartLineUp as PhChartLineUp,
  CurrencyDollar as PhCurrencyDollar,
  Wrench as PhWrench,
  MapPin as PhMapPin,
  Briefcase as PhBriefcase,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  X as PhX,
  Trash as PhTrash,
  PencilSimple as PhPencilSimple,
  Plus as PhPlus,
  MagnifyingGlass as PhMagnifyingGlass,
  Faders as PhFaders,
  DotsThree as PhDotsThree,
  List as PhList,
  Sun as PhSun,
  Moon as PhMoon,
  Phone as PhPhone,
  Envelope as PhEnvelope,
  ChatCircleText as PhChatCircleText,
  ChatCircle as PhChatCircle,
  File as PhFile,
  FileText as PhFileText,
  Download as PhDownload,
  Upload as PhUpload,
  Camera as PhCamera,
  Image as PhImage,
  VideoCamera as PhVideoCamera,
  Printer as PhPrinter,
  ShareNetwork as PhShareNetwork,
  Link as PhLink,
  ArrowSquareOut as PhArrowSquareOut,
  Copy as PhCopy,
  ClipboardText as PhClipboardText,
  LockKey as PhLockKey,
  LockKeyOpen as PhLockKeyOpen,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  Star as PhStar,
  Heart as PhHeart,
  Bookmark as PhBookmark,
  Tag as PhTag,
  Flag as PhFlag,
  Clock as PhClock,
  Timer as PhTimer,
  WarningCircle as PhWarningCircle,
  Warning as PhWarningTriangle,
  Info as PhInfo,
  Question as PhQuestion,
  SignOut as PhSignOut,
  SignIn as PhSignIn,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowUp as PhArrowUp,
  ArrowDown as PhArrowDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  CaretDown as PhCaretDown,
  SquaresFour as PhSquaresFour,
} from '@phosphor-icons/react'

