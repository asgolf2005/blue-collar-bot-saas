# Design Tokens Documentation

This document describes the design token system used in Blue Collar Bot SaaS.

## Overview

All design tokens are defined in `app/globals.css` as CSS custom properties (variables). The system uses semantic naming for maintainability and automatic dark mode support.

**Single Source of Truth:** `app/globals.css`

---

## Color Tokens

### Semantic Colors

Use semantic color names that describe **purpose**, not appearance:

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `--color-canvas` | Page background | Light gray | Dark gray |
| `--color-surface` | Card/panel background | White | Dark surface |
| `--color-ink` | Primary text | Near black | Near white |
| `--color-muted` | Secondary text | Gray | Light gray |
| `--color-border` | Borders | Light gray | Medium gray |

### Usage

```css
/* CSS */
.my-component {
  background: rgb(var(--color-surface));
  color: rgb(var(--color-ink));
  border-color: rgb(var(--color-border));
}
```

```tsx
/* Tailwind */
<div className="bg-surface text-ink border-surface-200">
  Content
</div>
```

---

## Color Scales

Each semantic color has a 50-950 scale for different shades:

### Surface Scale

| Token | Usage |
|-------|-------|
| `--color-surface-50` | Lightest backgrounds |
| `--color-surface-100` | Very light backgrounds |
| `--color-surface-200` | Light borders |
| `--color-surface-300` | Medium borders |
| `--color-surface-400` | Muted text |
| `--color-surface-500` | Secondary text |
| `--color-surface-600` | Body text |
| `--color-surface-700` | Emphasis text |
| `--color-surface-800` | Strong text |
| `--color-surface-900` | Darkest text |

### Primary Scale

| Token | Usage |
|-------|-------|
| `--color-primary-50` | Lightest primary |
| `--color-primary-600` | Main primary color |
| `--color-primary-700` | Primary hover |
| `--color-primary-900` | Darkest primary |

### Success Scale

| Token | Usage |
|-------|-------|
| `--color-success-50` | Success background |
| `--color-success-600` | Main success color |
| `--color-success-900` | Dark success |

### Danger Scale

| Token | Usage |
|-------|-------|
| `--color-danger-50` | Danger background |
| `--color-danger-600` | Main danger color |
| `--color-danger-900` | Dark danger |

### Warning Scale

| Token | Usage |
|-------|-------|
| `--color-warning-50` | Warning background |
| `--color-warning-600` | Main warning color |
| `--color-warning-900` | Dark warning |

---

## Spacing Tokens

Consistent spacing scale based on 4px increments:

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-1` | 4px | Tiny gaps |
| `--spacing-2` | 8px | Small gaps |
| `--spacing-3` | 12px | Medium gaps |
| `--spacing-4` | 16px | Standard gaps |
| `--spacing-5` | 20px | Large gaps |
| `--spacing-6` | 24px | Extra large gaps |
| `--spacing-8` | 32px | Section spacing |
| `--spacing-12` | 48px | Large sections |

### Usage

```css
.card {
  padding: var(--spacing-6);
  gap: var(--spacing-4);
}
```

---

## Typography Tokens

### Font Sizes

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 12px | Small labels |
| `--text-sm` | 14px | Body small |
| `--text-base` | 15px | Regular body |
| `--text-md` | 16px | Body emphasis |
| `--text-lg` | 18px | Subheadings |
| `--text-xl` | 20px | Headings |
| `--text-2xl` | 24px | Large headings |
| `--text-3xl` | 30px | Page titles |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis |
| `--font-semibold` | 600 | Strong emphasis |
| `--font-bold` | 700 | Headings |

---

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small elements |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Large cards |
| `--radius-2xl` | 20px | Prominent cards |
| `--radius-3xl` | 24px | Hero cards |
| `--radius-full` | 9999px | Circles, pills |

---

## Shadow Tokens

### Standard Shadows

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Subtle depth |
| `--shadow-sm` | Light elevation |
| `--shadow-md` | Medium elevation |
| `--shadow-lg` | High elevation |

### Glass Shadows

| Token | Usage |
|-------|-------|
| `--glass-shadow` | Glassmorphic shadow |
| `--btn-shadow-rest` | Button default |
| `--btn-shadow-hover` | Button hover |
| `--btn-shadow-active` | Button pressed |

---

## Animation Tokens

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--motion-fast` | 150ms | Quick interactions |
| `--motion-base` | 220ms | Standard transitions |
| `--motion-slow` | 320ms | Smooth animations |

### Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--easing-standard` | cubic-bezier(0.2, 0.8, 0.2, 1) | Smooth transitions |
| `--easing-exit` | cubic-bezier(0.4, 0, 1, 1) | Element exits |

### Usage

```css
.interactive {
  transition: all var(--motion-base) var(--easing-standard);
}
```

---

## Component Size Tokens

### Buttons

| Token | Value | Usage |
|-------|-------|-------|
| `--button-sm` | 32px | Small buttons |
| `--button-md` | 40px | Default buttons |
| `--button-lg` | 48px | Large buttons |

### Icons

| Token | Value | Usage |
|-------|-------|-------|
| `--icon-xs` | 12px | Tiny icons |
| `--icon-sm` | 16px | Small icons |
| `--icon-md` | 20px | Default icons |
| `--icon-lg` | 24px | Large icons |

### Avatars

| Token | Value | Usage |
|-------|-------|-------|
| `--avatar-sm` | 32px | Small avatars |
| `--avatar-md` | 40px | Default avatars |
| `--avatar-lg` | 48px | Large avatars |

---

## When to Use Inline Styles vs Classes

### Use Design Tokens (Inline Styles)

When values are **dynamic** or **component-specific**:

```tsx
// Dynamic values
<div style={{ width: `${progress}%` }} />

// Component-specific layouts
<div style={{
  display: 'flex',
  gap: 'var(--spacing-4)',
  padding: 'var(--spacing-6)'
}} />
```

### Use Classes

When values are **static** and **reusable**:

```tsx
// Static, reusable patterns
<button className="glass-btn-primary">
  Save
</button>

<div className="glass-card p-6">
  Content
</div>
```

---

## Dark Mode

All design tokens automatically adapt to dark mode. No manual dark mode classes needed:

```tsx
// ✓ Correct - Automatically adapts
<div className="bg-surface text-ink border-surface-200">
  Content
</div>

// ✗ Wrong - Manual dark mode
<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
  Content
</div>
```

---

## Best Practices

1. **Always use semantic tokens** - Not raw colors
   - ✓ `text-ink`
   - ✗ `text-gray-900`

2. **Use the scale** - Pick the right shade
   - ✓ `text-muted` for secondary text
   - ✗ `text-surface-400` directly

3. **Consistent spacing** - Stick to the scale
   - ✓ `gap-4` (16px)
   - ✗ `gap-[15px]` (arbitrary)

4. **Leverage CSS variables** - For dynamic values
   - ✓ `style={{ width: \`\${progress}%\` }}`
   - ✗ Hardcoded calculations

5. **Trust the system** - Dark mode is automatic
   - ✓ `bg-surface`
   - ✗ `bg-white dark:bg-gray-800`

---

## Migration from Legacy

### Old Tokens → New Tokens

| Legacy (design-tokens.css) | Modern (globals.css) |
|----------------------------|----------------------|
| `--blue-500` | `var(--color-primary-600)` |
| `--green-400` | `var(--color-success-600)` |
| `--red-500` | `var(--color-danger-600)` |
| `--gray-900` | `var(--color-ink)` |
| `--gray-500` | `var(--color-muted)` |
| `--gray-600` | `var(--color-surface-600)` |
| `--bg-card` | `var(--color-surface)` |

---

## Reference

- **Full token definitions:** `app/globals.css` (lines 15-137)
- **Glass effects:** `app/globals.css` (lines 113-137)
- **Component classes:** `app/globals.css` (lines 300+)
- **Migration guide:** `docs/DESIGN_SYSTEM_MIGRATION.md`

---

## Need Help?

- Unsure which token to use? Check existing components in `components/ui/`
- Need a new token? Discuss with the team before adding
- Found inconsistencies? Run `tsx scripts/validate-refactoring.ts`
