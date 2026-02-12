# Handoff Ready ✅

## What's Been Prepared

Created comprehensive implementation guide:
- `.kimi/codex-handoff-ui-improvements.md` - Full technical specs

---

## Your 3 Requests

### 1. Pipeline Jobs - Day/Week Filter
**Location**: `/admin/jobs`
**Change**: Add toggle (Day | Week | All) to filter pipeline jobs
- Day = Today's jobs only
- Week = This week's jobs (Mon-Sun)
- All = Current behavior (90 days)

### 2. Button Redesign
**Problem**: "+ NEW JOB" text wraps to multiple lines
**Fix**: 
- Single-line buttons (add `whitespace-nowrap`)
- Optional glassmorphic style (modern, translucent)
- Pill shape (`rounded-full`)

### 3. Schedule Page Improvements
**Location**: `/admin/schedule`
**Changes**:
- Reduce hour height from 80px → 48px (more density)
- See 6am-10pm with less scrolling
- Advanced scrubbing: hover arrow buttons for 1 day/week/month/year jumps

---

## How to Execute

### Option A: Give to Codex (Recommended)

**Copy-paste this to Codex (Ctrl+I):**

```
Implement all UI improvements from .kimi/codex-handoff-ui-improvements.md:

1. Add day/week/all filter to app/admin/jobs/page.tsx pipeline
2. Fix buttons to be single-line with glassmorphic option (update Button.tsx and apply)
3. Improve schedule page density (reduce HOUR_HEIGHT) and add advanced scrubbing with 1 day/week/month/year options

Run build and lint after changes.
```

### Option B: Do It Yourself

Follow the `.kimi/codex-handoff-ui-improvements.md` file step-by-step.

---

## Expected Result

| Before | After |
|--------|-------|
| Pipeline shows 90 days mixed | Pipeline filtered by day/week/all |
| Buttons wrap text | Single-line, glassmorphic buttons |
| Schedule sparse, lots of scroll | Compact, 6am-10pm visible |
| Simple prev/next | Advanced scrubbing with options |

---

**Ready?** Paste the command above into Codex! 🚀
