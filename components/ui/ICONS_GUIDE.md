# Icon System Guide for Codex

## Overview
Blue Collar Bot now uses a **unified icon system** combining:
1. **Lucide React** (primary) - 1,500+ minimal outline icons
2. **Phosphor Icons** (extended) - 9,000+ icons with 6 weight variants including duotone

**Total: 10,000+ icons available**

---

## Installation (Already Done)
```bash
npm install lucide-react        # Already installed
npm install @phosphor-icons/react # Just installed
```

---

## Quick Usage

### Server Components (Important)
If you're in a Server Component (no `'use client'`), **do not import** from `@/components/ui/icons` because Phosphor uses React context and can break RSC builds.

Use the Lucide-only shim instead:
```tsx
import { Calendar, Wrench } from '@/components/ui/lucide'
```

### Option 1: Use the Unified `Icon` Component (Recommended)
```tsx
import { Icon, IconButton } from '@/components/ui/icons'

// By name from registry
<Icon name="settings" size="md" />
<Icon name="user" size="lg" color="rgb(var(--neon-cyan))" />

// With click handler
<IconButton 
  name="delete" 
  variant="ghost" 
  onClick={handleDelete}
  ariaLabel="Delete item"
/>
```

### Option 2: Import Specific Icons Directly
```tsx
import { 
  Settings, User, Calendar,    // Lucide icons
  PhGear, PhUser, PhCalendar   // Phosphor icons (Ph prefix)
} from '@/components/ui/icons'

<Settings className="w-5 h-5" />
<PhGear weight="duotone" size={24} />  // Phosphor with duotone effect
```

---

## Icon Sizes (Standardized)

| Size | Pixels | Use Case |
|------|--------|----------|
| `xs` | 12px | Inline text, compact lists |
| `sm` | 16px | Buttons, form inputs |
| `md` | 20px | Default for most UI |
| `lg` | 24px | Navigation, headers |
| `xl` | 32px | Empty states, feature highlights |

---

## When to Use Which Library

### Use Lucide (Default)
- Standard UI elements
- Clean, minimal outline style
- Navigation, buttons, form controls
- When you want consistency with existing codebase

```tsx
import { Home, User, Settings } from '@/components/ui/icons'
<Home size={20} />
```

### Use Phosphor (Extended Variety)
- Need **fill** variants
- Need **duotone** effects
- Want different **weights** (thin, light, regular, bold)
- Emphasis on active/selected states

```tsx
import { PhHouse, PhUser, PhGear } from '@/components/ui/icons'
<PhHouse weight="duotone" />     // Two-tone effect
<PhUser weight="fill" />          // Filled icon
<PhGear weight="bold" />          // Thicker stroke
```

---

## Icon Registry (Named Icons)

The following names can be used with `<Icon name="..." />`:

### Navigation
`home`, `dashboard`, `menu`, `close`, `back`, `forward`, `chevronLeft`, `chevronRight`

### Actions
`add`, `plus`, `edit`, `pencil`, `delete`, `trash`, `save`, `cancel`, `check`, `refresh`, `search`, `filter`, `more`

### Communication
`email`, `mail`, `phone`, `message`, `chat`, `notification`, `bell`

### Users
`user`, `users`, `profile`, `customer`, `technician`

### Business
`job`, `jobs`, `calendar`, `schedule`, `time`, `location`, `address`, `building`, `business`

### Services
`service`, `services`, `wrench`, `tools`, `settings`, `gear`

### Money
`invoice`, `receipt`, `payment`, `creditCard`, `money`, `billing`

### Status
`success`, `error`, `warning`, `alert`, `info`, `help`, `loading`

### Phosphor Variants (Prefix with `phosphor`)
`phosphorHome`, `phosphorSettings`, `phosphorUser`, `phosphorBell`, `phosphorChart`, etc.

---

## Best Practices

1. **Size Consistency**: Use the standardized sizes (`xs`, `sm`, `md`, `lg`, `xl`)
2. **Color**: Use CSS variables `rgb(var(--neon-cyan))` instead of hardcoded colors
3. **Accessibility**: Always include `ariaLabel` for icon buttons
4. **No Mixing Styles**: Don't mix Lucide outline with Phosphor outline in same context - use Phosphor duotone/fill for variety
5. **Import from unified file**: Import from `@/components/ui/icons` instead of directly from libraries

---

## Examples

### Navigation Item
```tsx
<Icon name="calendar" size="md" />
<span>Schedule</span>
```

### Action Button
```tsx
<button className="btn-primary">
  <Icon name="plus" size="sm" />
  <span>New Job</span>
</button>
```

### Status Indicator
```tsx
<Icon name="success" size="md" color="rgb(var(--neon-emerald))" />
<Icon name="warning" size="md" color="rgb(var(--neon-amber))" />
<Icon name="error" size="md" color="rgb(var(--neon-rose))" />
```

### Phosphor Duotone for Emphasis
```tsx
// Active nav item
<PhHouse weight="duotone" size={24} color="rgb(var(--neon-cyan))" />

// Filled favorite
<PhHeart weight="fill" size={24} color="rgb(var(--neon-rose))" />
```

---

## Do NOT
- Add Font Awesome
- Add Material Icons
- Add other icon libraries
- Use hardcoded icon SVGs inline
- Mix more than 2 icon styles in one component

---

## Resources
- Lucide: https://lucide.dev/icons/
- Phosphor: https://phosphoricons.com/
- Unified icons file: `components/ui/icons.tsx`


