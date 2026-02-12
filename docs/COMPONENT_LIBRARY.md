# Component Library

Reusable components built on the glassmorphic design system.

---

## Navigation Components

### AdminNavBar

Top navigation bar for admin pages with logo, navigation tabs, search, team avatars, and profile.

**Location:** `components/ui/AdminNavBar.tsx`

**Props:**
```tsx
interface AdminNavBarProps {
  profileName: string | null
  technicians?: Technician[]
}
```

**Example:**
```tsx
<AdminNavBar
  profileName="John Doe"
  technicians={technicians}
/>
```

**Features:**
- Company logo
- Navigation tabs (Dashboard, Employees, Analytics)
- Search button
- Team avatar group
- Add employee button
- Notification bell
- Profile avatar

---

## Job Components

### JobCard

Complete job card with all metadata, supporting urgent/priority variants.

**Location:** `components/ui/JobCard.tsx`

**Props:**
```tsx
interface JobCardProps {
  job: {
    id: string
    title: string
    description: string
    startTime: Date
    endTime: Date
    address: string
    technicians: string[]
    isUrgent: boolean
    countdown?: string
  }
  isPriority?: boolean
}
```

**Example:**
```tsx
<JobCard
  job={job}
  isPriority={index === 0}
/>
```

**Features:**
- Countdown badge (for priority jobs)
- Title and description
- Time, date, and location pills
- Technician avatars
- Urgent variant (yellow background)
- Hover effects

---

### InfoPill

Small metadata pill for displaying time, date, location, etc.

**Location:** `components/ui/InfoPill.tsx`

**Props:**
```tsx
interface InfoPillProps {
  icon: ReactNode
  children: ReactNode
  variant?: 'default' | 'urgent'
  maxWidth?: string
}
```

**Example:**
```tsx
<InfoPill
  icon={<Clock style={{ width: '100%', height: '100%' }} />}
  variant="urgent"
>
  09:00 - 17:00
</InfoPill>
```

**Variants:**
- `default` - White background
- `urgent` - Semi-transparent white for urgent jobs

---

### CountdownBadge

Countdown timer badge with pulse indicator.

**Location:** `components/ui/CountdownBadge.tsx`

**Props:**
```tsx
interface CountdownBadgeProps {
  countdown: string
  variant?: 'default' | 'urgent'
}
```

**Example:**
```tsx
<CountdownBadge
  countdown="2 hours"
  variant="urgent"
/>
```

**Features:**
- Animated pulse indicator
- Absolute positioning (top-right)
- Color variants

---

### JobStatusBadge

Status badge for job states with semantic colors.

**Location:** `components/ui/JobStatusBadge.tsx`

**Props:**
```tsx
interface JobStatusBadgeProps {
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  withPulse?: boolean
}
```

**Example:**
```tsx
<JobStatusBadge
  status="in_progress"
  withPulse={true}
/>
```

**Status Colors:**
- `scheduled` - Blue
- `in_progress` - Yellow (with pulse)
- `completed` - Green
- `cancelled` - Red

---

## Dashboard Components

### MetricCard

KPI display card with value, icon, change indicator, and optional progress bar.

**Location:** `components/ui/MetricCard.tsx`

**Props:**
```tsx
interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  change?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'profit' | 'danger' | 'warning' | 'info'
  progress?: number
  withPulse?: boolean
}
```

**Example:**
```tsx
<MetricCard
  label="Total Revenue"
  value="$12,345"
  icon={<DollarSign className="w-8 h-8" />}
  change={{ value: 12.5, isPositive: true }}
  variant="profit"
  progress={75}
/>
```

**Features:**
- Large metric value display
- Optional icon
- Change indicator with arrow
- Optional progress bar
- Pulse indicator for live data
- Gradient background effects

**Variants:**
- `default` - Neutral
- `profit` - Green accent
- `danger` - Red accent
- `warning` - Yellow accent
- `info` - Blue accent

---

## Avatar Components

### TechnicianAvatar

Single avatar with image support and initials fallback.

**Location:** `components/ui/TechnicianAvatar.tsx`

**Props:**
```tsx
interface TechnicianAvatarProps {
  name?: string | null
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}
```

**Example:**
```tsx
<TechnicianAvatar
  name="John Doe"
  imageUrl="/path/to/image.jpg"
  size="md"
/>
```

**Sizes:**
- `xs` - 24px
- `sm` - 32px
- `md` - 40px (default)
- `lg` - 48px
- `xl` - 64px

**Features:**
- Image with fallback to initials
- Gradient background
- Rounded circle
- Responsive sizing

---

### TechnicianAvatarGroup

Stacked avatar group with overflow counter.

**Location:** `components/ui/TechnicianAvatar.tsx` (exported)

**Props:**
```tsx
interface TechnicianAvatarGroupProps {
  technicians: Array<{
    id: string
    name?: string | null
    imageUrl?: string | null
  }>
  maxDisplay?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}
```

**Example:**
```tsx
<TechnicianAvatarGroup
  technicians={technicians}
  maxDisplay={3}
  size="sm"
/>
```

**Features:**
- Overlapping avatars
- "+N" counter for overflow
- Configurable max display count
- Consistent sizing

---

## Glass Components (From Design System)

### Buttons

All glass buttons from `app/globals.css`:

**Primary Actions:**
```tsx
<button className="glass-btn-primary">Save Changes</button>
```

**Secondary Actions:**
```tsx
<button className="glass-btn-secondary">Cancel</button>
```

**Success/Profit:**
```tsx
<button className="glass-btn-profit">Approve</button>
```

**Danger:**
```tsx
<button className="glass-btn-danger">Delete</button>
```

**Ghost:**
```tsx
<button className="glass-btn-ghost">View More</button>
```

**Neon Outline:**
```tsx
<button className="glass-btn-neon">Learn More</button>
```

**Size Variants:**
```tsx
<button className="glass-btn-primary glass-btn-sm">Small</button>
<button className="glass-btn-primary">Medium (default)</button>
<button className="glass-btn-primary glass-btn-lg">Large</button>
```

**Icon Only:**
```tsx
<button className="glass-btn-primary glass-btn-icon">
  <Plus className="w-5 h-5" />
</button>
```

---

### Cards

All glass cards from `app/globals.css`:

**Standard Card:**
```tsx
<div className="glass-card">
  Content
</div>
```

**Interactive Card:**
```tsx
<div className="glass-card-interactive">
  Clickable content
</div>
```

**Neon Accent:**
```tsx
<div className="glass-card-neon">
  Highlighted content
</div>
```

**Profit/Success:**
```tsx
<div className="glass-card-profit">
  Success metric
</div>
```

**Danger:**
```tsx
<div className="glass-card-danger">
  Warning content
</div>
```

**Elevated:**
```tsx
<div className="glass-card-elevated">
  Prominent content
</div>
```

**Subtle:**
```tsx
<div className="glass-card-subtle">
  Minimal content
</div>
```

**Panel:**
```tsx
<div className="glass-panel p-6">
  Full-width section
</div>
```

---

## Design Patterns

### When to Create a Component

Create a new component when:
1. Pattern is used 3+ times
2. Logic is complex (>30 lines)
3. Needs to be consistent across pages
4. Has multiple variants/states

### When to Use Classes

Use existing classes when:
1. Simple, one-time layout
2. No state management needed
3. Standard design system pattern
4. Less than 10 lines of markup

### Component Structure

```tsx
// 1. Imports
import { ReactNode } from 'react'

// 2. Types
interface MyComponentProps {
  // Props
}

// 3. Constants/Config
const VARIANTS = {
  default: 'class-names',
  // ...
}

// 4. Component
export default function MyComponent({ prop }: MyComponentProps) {
  return (
    // JSX
  )
}

// 5. Sub-components (if needed)
function MySubComponent() {
  return null
}
```

---

## Best Practices

1. **Use TypeScript** - Always type your props
2. **Default props** - Provide sensible defaults
3. **Variants** - Use string literals for variants
4. **Composition** - Build complex components from simple ones
5. **Design tokens** - Use CSS variables, not hardcoded values
6. **Accessibility** - Include ARIA labels where appropriate
7. **Dark mode** - Test in both light and dark mode
8. **Responsive** - Test on mobile, tablet, desktop

---

## Adding New Components

1. Create component in `components/ui/`
2. Export from `components/ui/index.ts` (if exists)
3. Add documentation to this file
4. Add examples
5. Test in storybook (if available)
6. Add to validation script

---

## Component Checklist

When creating a new component:

- [ ] TypeScript interfaces defined
- [ ] Props have sensible defaults
- [ ] Uses design tokens (not hardcoded values)
- [ ] Supports all necessary variants
- [ ] Dark mode compatible
- [ ] Responsive on all screen sizes
- [ ] Accessible (keyboard navigation, ARIA)
- [ ] Documented in this file
- [ ] Example usage provided
- [ ] Tested in actual pages

---

## Need Help?

- Review existing components for patterns
- Check `app/globals.css` for available classes
- See `DESIGN_TOKENS.md` for token usage
- Run validation: `tsx scripts/validate-refactoring.ts`
