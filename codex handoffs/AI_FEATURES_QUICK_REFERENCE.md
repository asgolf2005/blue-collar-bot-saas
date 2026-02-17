# AI Tech Features - Quick Reference for Codex

## 🚀 What to Build (In Order)

### Phase 1: MUST HAVE (Start Here)
| # | Feature | User Value | Complexity |
|---|---------|------------|------------|
| 1 | **Voice-to-Notes** ⭐ | Save 5 min/job | Medium |
| 2 | **Photo Part ID** | Never guess parts | Medium |

### Phase 2: SHOULD HAVE
| # | Feature | User Value | Complexity |
|---|---------|------------|------------|
| 3 | **Troubleshoot Chat** | Real-time help | Medium |
| 4 | **Safety Checker** | Liability protection | High |

### Phase 3: NICE TO HAVE
| # | Feature | User Value | Complexity |
|---|---------|------------|------------|
| 5 | **Completion Summary** | Auto customer emails | Low |
| 6 | **Smart Messages** | One-tap texts | Low |
| 7 | **Time Estimates** | Better scheduling | Low |

---

## 🛠️ Technical Stack

```
Frontend: Next.js 16 + React 19 + TypeScript
Styling: Tailwind CSS + glassmorphic design
AI: OpenAI (Whisper, GPT-4o-mini, GPT-4 Vision)
Backend: Supabase + API Routes
Icons: Lucide + Phosphor (components/ui/icons.tsx)
```

---

## 📁 File Structure to Create

```
lib/ai/
├── openai.ts              ✅ (DONE - exists)
├── voice-notes.ts         # Voice processing logic
├── part-identification.ts # Image analysis logic
├── troubleshooting.ts     # Diagnostic assistant
└── safety-check.ts        # Photo validation rules

app/api/ai/
├── voice-notes/route.ts       # POST /api/ai/voice-notes
├── identify-part/route.ts     # POST /api/ai/identify-part
├── troubleshoot/route.ts      # POST /api/ai/troubleshoot
├── safety-check/route.ts      # POST /api/ai/safety-check
└── generate-summary/route.ts  # POST /api/ai/generate-summary

components/tech/
├── VoiceNoteButton.tsx         # Hold-to-record button
├── PartIdentifier.tsx          # Camera + results UI
├── TroubleshootChat.tsx        # Chat interface
├── SafetyChecklist.tsx         # Photo validation UI
├── CompletionSummary.tsx       # Generated summary view
└── SmartMessageButton.tsx      # Message suggestions

hooks/
├── useVoiceRecorder.ts         # Audio recording hook
└── useAIChat.ts                # Chat state management
```

---

## 🎨 Design Tokens (USE THESE)

```css
/* Primary AI accent */
color: rgb(var(--neon-cyan));
bg: rgba(var(--neon-cyan), 0.1);
border: rgba(var(--neon-cyan), 0.3);

/* Success states */
color: rgb(var(--neon-emerald));

/* Warning states */
color: rgb(var(--neon-amber));

/* Error states */
color: rgb(var(--neon-rose));
```

---

## 🔑 Environment Variable

Add to `.env.local`:
```
OPENAI_API_KEY=sk-your-key-here
```

---

## 📋 Code Pattern Template

### API Route Pattern
```typescript
// app/api/ai/[feature]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, Models } from '@/lib/ai/openai'

export async function POST(request: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Get data
    const { jobId, data } = await request.json()

    // 3. Verify job access
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('technician_id', user.id)
      .single()
    
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // 4. Call AI
    const completion = await openai.chat.completions.create({
      model: Models.FAST,
      messages: [
        { role: 'system', content: 'Your system prompt here' },
        { role: 'user', content: data }
      ]
    })

    // 5. Return
    return NextResponse.json({ 
      success: true, 
      result: completion.choices[0].message.content 
    })
  } catch (error) {
    console.error('AI error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## ✅ Checklist Before Submitting

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Works on mobile (touch targets 48px+)
- [ ] Error handling with fallback UI
- [ ] Uses existing icon system
- [ ] Follows glassmorphic design
- [ ] Dark mode tested

---

## 📞 Questions?

If unclear, ask rather than guess.

**Priority order matters** - get Voice-to-Notes perfect before starting Photo ID.

**Quality > Quantity** - 2 perfect features > 5 broken ones.

---

**Full spec:** `codex handoffs/codex-handoff-2026-02-13-ai-tech-features.txt`
