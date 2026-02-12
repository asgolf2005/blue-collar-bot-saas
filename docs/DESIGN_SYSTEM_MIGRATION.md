# Design System Migration Guide

This guide helps you migrate from legacy design system classes to the modern glassmorphic design system.

## Overview

The Blue Collar Bot SaaS application is transitioning from legacy button and card classes to a modern glassmorphic design system. This guide provides step-by-step instructions for migrating your code.

---

## Button Migration

### Legacy → Modern Mapping

| Legacy Class | Modern Class | Description |
|--------------|--------------|-------------|
| `.btn-primary` | `.glass-btn-primary` | Primary action button (blue) |
| `.btn-secondary` | `.glass-btn-secondary` | Secondary button (neutral) |
| `.btn-profit` | `.glass-btn-profit` | Success/profit button (green) |
| `.btn-danger` | `.glass-btn-danger` | Danger/warning button (red) |
| `.btn-ghost` | `.glass-btn-ghost` | Minimal/ghost button |
| `.btn-neon` | `.glass-btn-neon` | Neon outline button |

### Size Modifiers

- `.glass-btn-sm` - Small button
- `.glass-btn-lg` - Large button
- `.glass-btn-icon` - Icon-only button (no text)

### Examples

**Before:**
```tsx
<button className="btn btn-primary">
  Save Changes
</button>
```

**After:**
```tsx
<button className="glass-btn-primary">
  Save Changes
</button>
```

**Icon Button - Before:**
```tsx
<button className="btn btn-primary btn-icon">
  <Plus />
</button>
```

**Icon Button - After:**
```tsx
<button className="glass-btn-primary glass-btn-icon">
  <Plus />
</button>
```

---

## Card Migration

### Legacy → Modern Mapping

| Legacy Class | Modern Class | Description |
|--------------|--------------|-------------|
| `.card` | `.glass-card` | Standard card |
| `.card-interactive` | `.glass-card-interactive` | Clickable/hoverable card |
| `.card-neon` | `.glass-card-neon` | Card with neon accent |
| `.card-profit` | `.glass-card-profit` | Success/profit card (green) |
| `.card-loss` | `.glass-card-danger` | Loss/danger card (red) |

### Additional Variants

- `.glass-card-elevated` - More prominent card with higher elevation
- `.glass-card-subtle` - Minimal card with subtle styling
- `.glass-panel` - Full-width panel section

### Examples

**Before:**
```tsx
<div className="card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

**After:**
```tsx
<div className="glass-card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

**Interactive Card - Before:**
```tsx
<div className="card card-interactive">
  <h3>Clickable Card</h3>
</div>
```

**Interactive Card - After:**
```tsx
<div className="glass-card-interactive">
  <h3>Clickable Card</h3>
</div>
```

---

## Color Token Migration

### Hardcoded Colors → Design Tokens

Replace hardcoded Tailwind colors with semantic design tokens:

| Hardcoded Color | Design Token | Usage |
|----------------|--------------|-------|
| `text-slate-900` | `text-ink` | Primary text |
| `text-slate-500` | `text-muted` | Secondary text |
| `bg-white` | `bg-surface` | Surface background |
| `bg-slate-50` | `bg-surface-50` | Light surface |
| `border-slate-200` | `border-surface-200` | Borders |
| `bg-blue-500` | `bg-primary` | Primary color |
| `bg-green-500` | `bg-success` | Success color |
| `bg-red-500` | `bg-danger` | Danger color |

### Examples

**Before:**
```tsx
<div className="bg-white text-slate-900 border-slate-200">
  Content
</div>
```

**After:**
```tsx
<div className="bg-surface text-ink border-surface-200">
  Content
</div>
```

---

## Migration Checklist

Use this checklist when migrating a component:

- [ ] Replace all `.btn-*` classes with `.glass-btn-*`
- [ ] Replace all `.card-*` classes with `.glass-card-*`
- [ ] Replace hardcoded `slate-*` colors with design tokens
- [ ] Replace hardcoded `blue-*`, `green-*`, `red-*` with semantic tokens
- [ ] Test in both light and dark mode
- [ ] Verify hover and focus states work correctly
- [ ] Check responsive layouts on mobile/tablet/desktop

---

## Common Patterns

### Form Buttons

**Before:**
```tsx
<div className="flex gap-2">
  <button className="btn btn-secondary">Cancel</button>
  <button className="btn btn-primary">Submit</button>
</div>
```

**After:**
```tsx
<div className="flex gap-2">
  <button className="glass-btn-secondary">Cancel</button>
  <button className="glass-btn-primary">Submit</button>
</div>
```

### Metric Cards

**Before:**
```tsx
<div className="card card-profit">
  <div className="text-slate-500">Total Revenue</div>
  <div className="text-slate-900">$12,345</div>
</div>
```

**After:**
```tsx
<div className="glass-card-profit">
  <div className="text-muted">Total Revenue</div>
  <div className="text-ink">$12,345</div>
</div>
```

### Navigation Items

**Before:**
```tsx
<Link href="/dashboard" className="btn btn-ghost">
  Dashboard
</Link>
```

**After:**
```tsx
<Link href="/dashboard" className="glass-btn-ghost">
  Dashboard
</Link>
```

---

## Automated Migration

Use the migration detection script to find legacy classes:

```bash
tsx scripts/migrate-design-system.ts
```

This will generate a report (`legacy-design-system-report.json`) with:
- Files containing legacy classes
- Line numbers
- Suggested replacements

---

## Dark Mode Compatibility

The glassmorphic design system is **fully dark mode compatible**. When migrating:

1. Remove dark mode variants from hardcoded colors:
   - `text-slate-900 dark:text-white` → `text-ink`
   - `bg-white dark:bg-slate-800` → `bg-surface`
   - `border-slate-200 dark:border-slate-700` → `border-surface-200`

2. Design tokens automatically adapt to dark mode
3. No manual dark mode styling needed

---

## Need Help?

- Review existing components in `components/ui/` for examples
- Check `app/globals.css` for full design system documentation
- See `COMPONENT_LIBRARY.md` for reusable components
- Run validation script: `tsx scripts/validate-refactoring.ts`

---

## Timeline

- **Legacy classes remain functional** - No breaking changes
- **New code should use modern classes** - Starting immediately
- **Full migration recommended** - Within next 2 sprints
- **Legacy classes may be removed** - In future major version
