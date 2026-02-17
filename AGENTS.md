# AGENTS.md

## Purpose
- Build a light CRM for trade businesses (admin dashboard, technician app, AI receptionist integration).
- Keep UX fast, practical, and mobile friendly.

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage, RLS)
- n8n, Twilio, Stripe (see docs for details)

## Workflow
- Default to direct edits in this repo unless the user asks for branches or PRs.
- Keep changes scoped and update docs when behavior changes.
- Avoid destructive commands.

## Checks
- After code changes run:
  - `npm run lint`
  - `npm run build`
- If a change is docs only, note that checks were skipped.

## Safety / Data
- Do not modify Supabase schema, migrations, or RLS unless explicitly asked.
- Do not edit `.env.local` or add secrets. Use `.env.example` for documentation.

## UI Design Guide (draft, keep updating)
Source of truth
- Tokens and base styles live in `app/globals.css`.
- `styles/design-tokens.css` is deprecated; do not add tokens there.
- Theme presets live in `lib/themes/presets.ts` (defaults: typography=manrope, density=cozy, radius=pill, motion=balanced).

Visual language
- Glassmorphic, light-first palette with blue primary and muted neutrals.
- Use CSS color variables (example: `rgb(var(--color-primary-600))`) instead of hardcoded hex.
- Prefer existing utility classes and component patterns in `app/` and `components/`.

Typography
- MAXIMUM 3 FONTS ONLY - No exceptions without explicit user approval
- Approved fonts (defined in app/layout.tsx):
  1. Bebas Neue (--font-display) - Headers, titles, brand text
  2. Inter (--font-sans) - Body text, UI elements, descriptions  
  3. JetBrains Mono (--font-mono) - Data labels, technical text, metrics
- Tailwind classes: font-display, font-sans, font-mono
- Do not import additional Google Fonts or add font-family declarations
- Scan existing code for any hardcoded fonts and remove them

Layout and spacing
- Use Tailwind spacing scale; avoid one-off pixel values unless matching an existing component.
- Favor mobile-first layouts with clear hierarchy and compact scanning.

Color usage
- Prefer theme color utilities from `tailwind.config.ts` (example: `text-ink`, `bg-canvas`, `border-border`).
- Use semantic colors for status (`success`, `warning`, `danger`, `info`) and keep contrast readable.
- Keep primary actions in the electric/primary range; avoid new accent colors.

Surfaces and elevation
- Use surface tokens for cards and panels; keep glass effects subtle.
- Prefer existing shadows (`shadow-elevation-1/2/3`, `shadow-glass`) over custom values.

Motion
- Prefer `--motion-*` and `--easing-*` variables for transitions. Keep motion subtle.
- Use existing animations (`animate-fade-in`, `animate-fade-in-up`, `animate-scale-in`, `animate-reveal-stagger`) before adding new ones.

Components
- Prefer existing button styles (`.glass-btn-*`) and card patterns; match radius and shadow tokens.
- Form controls should match the pill radius and use consistent focus rings.
- Tables and lists should use muted dividers, readable density, and clear hover states.
- Charts should use `chart-*` colors from the theme.

Icons
- Primary source: `components/ui/icons.tsx` - Unified Lucide + Phosphor system
- Two icon libraries approved:
  1. Lucide React (`lucide-react`) - Primary, minimal outline style
  2. Phosphor Icons (`@phosphor-icons/react`) - Extended variety with 6 weights including duotone
- Total combined icons: 10,000+
- Preferred usage:
  ```tsx
  // Use the unified Icon component
  import { Icon, IconButton } from '@/components/ui/icons'
  <Icon name="settings" size="md" />
  <IconButton name="delete" variant="ghost" onClick={handleDelete} />
  
  // Or import specific icons directly
  import { Settings, PhGear } from '@/components/ui/icons'
  <Settings className="w-5 h-5" />  // Lucide
  <PhGear weight="duotone" />       // Phosphor with duotone
  ```
- Icon sizes (standardized): xs(12), sm(16), md(20), lg(24), xl(32)
- When to use Lucide: Standard UI elements, clean outline style preferred
- When to use Phosphor: Need fill variants, duotone effects, or different weights
- Always use the Icon wrapper for consistent sizing and styling
- Do NOT add additional icon libraries without explicit approval
- Do NOT use Font Awesome, Material Icons, or other icon sets
