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
- Do not introduce new fonts without explicit approval; use the current preset.

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
