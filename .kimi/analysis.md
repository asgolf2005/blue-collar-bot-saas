# Supabase Realtime Sync Analysis

## Project Context
- **Stack**: Next.js 16 + React 19 + TypeScript + Supabase
- **Pattern**: Server components fetch initial data → Client providers handle realtime
- **Problem Domain**: Trade business SaaS (jobs, customers, technicians)

## Architecture Review

### 1. Supabase Client Setup ✅
**Files**: `lib/supabase/client.ts`, `server.ts`, `realtime.ts`
- ✅ Using `@supabase/ssr` correctly
- ✅ Separate browser/server clients
- ✅ Cookie handling for auth

### 2. Realtime Hooks Analysis

#### `hooks/useJobsRealtime.ts` ⚠️ ISSUES FOUND
**Problems**:
1. **Duplicate job filtering logic is brittle** (lines 52-58, 69-72)
2. **Missing relation refetch** - Only updates raw job, not customer/technician data
3. **No connection recovery** - If subscription drops, doesn't auto-retry
4. **Filter by business_id only** - Doesn't handle technician-specific filtering well

#### `hooks/useRealtimeJobs.ts` ⚠️ ISSUES FOUND
**Problems**:
1. **No relation data** - Returns raw jobs without customer/technician names
2. **Creates new Supabase client on every render** (line 41 inside component)
3. **Callback dependencies** - `handleJobChange` recreates frequently causing resubscriptions

#### `hooks/useRealtimeJobsWithRelations.ts` ⚠️ ISSUES FOUND
**Problems**:
1. **Full refetch on every change** - Expensive! Reloads ALL jobs on any update
2. **Race conditions possible** - `isMountedRef` pattern but no request deduplication
3. **Fallback select logic** - Unnecessary complexity, should just work
4. **Memory leak risk** - Channel cleanup might not fire on rapid unmount/remount

### 3. Provider Pattern Analysis

#### `components/admin/JobsRealtimeProvider.tsx` ⚠️ ISSUES
**Problems**:
1. **Context + Hook combo** - Adds abstraction layer that can mask issues
2. **No persistence** - If user navigates away and back, reconnects from scratch
3. **Toast spam** - Every status change shows toast (can be overwhelming)

#### `components/admin/JobsRealtimeWrapper.tsx` ✅
- Simple wrapper, no issues

### 4. Page Usage Analysis

#### `app/admin/jobs/page.tsx` ⚠️ ISSUES
**Problems**:
1. **Server component fetches with relations** - Good
2. **No realtime wrapper used!** - Page shows static data, no live updates
3. **"LIVE" indicator is fake** (line 161-162) - Just CSS animation, not actual connection status

#### `app/tech/dashboard/page.tsx` ⚠️ ISSUES
**Problems**:
1. **Passes data to TechDashboardClient** - But we can't see if client subscribes to realtime
2. **No realtime data flow** - Initial fetch only, no updates

### 5. Critical Missing Pieces

1. **No Optimistic Updates** - UI waits for server roundtrip
2. **No Request Deduplication** - Multiple rapid changes = multiple fetches
3. **No Error Boundaries** - Realtime errors can crash components
4. **No Reconnection Strategy** - Network blip = stale data
5. **Related Data Stale** - Customer name changes don't propagate to job cards

## Root Causes Summary

| Issue | Impact | Severity |
|-------|--------|----------|
| Admin jobs page has no realtime | Data appears stale | 🔴 HIGH |
| Relations not refetched on update | Customer names outdated | 🔴 HIGH |
| Full table refetch on change | Performance issues | 🟡 MEDIUM |
| Multiple competing hooks | Memory leaks, conflicts | 🟡 MEDIUM |
| Fake "LIVE" indicator | UX confusion | 🟡 MEDIUM |

## Recommended Fix Strategy

### Phase 1: Quick Wins (Immediate)
1. Add `JobsRealtimeWrapper` to admin/jobs/page.tsx
2. Fix `useRealtimeJobsWithRelations` to merge updates, not full refetch
3. Add connection status indicator (real one)

### Phase 2: Proper Architecture (1-2 hours)
1. Create unified realtime hook with intelligent merging
2. Add optimistic updates
3. Implement reconnection logic
4. Add error boundaries

### Phase 3: Performance (Optional)
1. Pagination with realtime
2. Selective field subscriptions
3. Debounced updates
