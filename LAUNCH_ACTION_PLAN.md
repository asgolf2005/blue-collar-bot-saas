# 🚀 Launch Action Plan - Blue Collar Bot SaaS

**Target Launch:** Within 1 month  
**Current Status:** Build passing, core features complete  
**Last Updated:** February 5, 2026

---

## ✅ IMMEDIATE WINS (Completed Today)

1. ✅ **Fixed build errors**
   - Added missing icon imports to analytics page
   - Fixed type error in `useOverlayElevation` hook
   - Fixed ESLint error (setState in effect pattern)

2. ✅ **Removed debug code**
   - Removed debug panel from `/admin/invoices/new` page

3. ✅ **Verified security**
   - Seed routes already protected for production
   - Build passing, lint clean

---

## 📋 PRIORITY 1: MUST FIX BEFORE LAUNCH

### 1. Clean Up Console.logs (2-3 hours)
**Risk:** Security, performance, unprofessional  
**Files to clean:**
```
app/api/stripe/webhook/route.ts (26 logs) - HIGH PRIORITY
app/api/assistant/route.ts (6 logs)
app/api/invoices/bulk-send/route.ts (5 logs)
app/api/seed/route.ts (4 logs)
components/tech/*.tsx (various)
```

**Action:** Replace with proper logging or remove

### 2. Stripe Integration Testing (4-6 hours)
**Risk:** Payment flow broken = no revenue  
**Test scenarios:**
- [ ] Create subscription checkout
- [ ] Complete payment with test card
- [ ] Verify webhook handling
- [ ] Verify subscription status updates
- [ ] Test billing portal access

**Files to verify:**
- `app/api/stripe/webhook/route.ts` - Remove console.logs
- `app/api/subscriptions/*/route.ts` - Error handling
- `components/admin/SubscriptionManager.tsx` - UI flow

### 3. Email Integration (2-3 hours)
**Risk:** Notifications not sending  
**Verify:**
- [ ] Resend API key configured
- [ ] From domain verified
- [ ] Email templates working
- [ ] Error handling (don't crash if email fails)

### 4. Core Workflow Testing (4-6 hours)
**Test complete user journeys:**

**Journey 1: Business Onboarding**
- Sign up → Verify email → Create business → Complete onboarding

**Journey 2: Job Management**
- Admin creates customer → Creates job → Assigns technician
- Technician views job → Updates status → Adds notes/photos
- Customer views progress → Receives notifications

**Journey 3: Invoicing**
- Job completed → Create invoice → Send to customer
- Customer pays via Stripe → Payment confirmed

---

## 📋 PRIORITY 2: SHOULD FIX BEFORE LAUNCH

### 5. Loading States (4-6 hours)
**Current:** Basic skeletons exist, not consistently applied  
**Pages needing attention:**
- `/admin/jobs` - Add job list skeletons
- `/admin/customers` - Add customer table skeletons
- `/admin/invoices` - Add invoice list skeletons
- `/tech/today` - Add dashboard skeleton

**Skeleton components exist:** `components/ui/skeletons/*.tsx`

### 6. Empty States (3-4 hours)
**Current:** Basic empty states  
**Improvements:**
- Add illustrations (can use Lucide icons creatively)
- Add call-to-action buttons
- Better copy explaining next steps

**Priority pages:**
- Jobs list (when no jobs)
- Customers list (when no customers)
- Invoices list (when no invoices)
- Tech dashboard (when no jobs today)

### 7. Error Boundaries (2-3 hours)
**Current:** No error boundaries = white screen on crash  
**Add:**
- Global error boundary in `app/error.tsx`
- Section error boundaries for major features
- User-friendly error messages

### 8. Mobile Responsiveness (4-6 hours)
**Current:** Mobile-first design, but needs testing  
**Test on:**
- iPhone (Safari)
- Android (Chrome)
- iPad (tablet view)

**Focus areas:**
- Admin sidebar → mobile menu
- Tech dashboard → touch targets
- Customer portal → readability
- Forms → input zoom issues

---

## 📋 PRIORITY 3: NICE TO HAVE (Post-Launch)

### 9. SMS Notifications (Twilio)
**Status:** API routes exist, UI not wired  
**Effort:** 6-8 hours  
**Decision:** Can launch without, add within 2 weeks

### 10. Keyboard Shortcuts Help
**Status:** Framework exists, help modal not built  
**Effort:** 2-3 hours

### 11. Contextual Menus
**Status:** Component exists, not applied  
**Effort:** 3-4 hours

### 12. Performance Optimization
**Effort:** 4-6 hours
- Image optimization
- Code splitting review
- Bundle analysis

---

## 🗓️ SUGGESTED TIMELINE

### Week 1 (Feb 6-12): Critical Fixes
| Day | Task | Owner |
|-----|------|-------|
| 1 | Clean console.logs | Dev |
| 1-2 | Stripe integration testing | Dev |
| 2 | Email verification | Dev |
| 3-4 | Core workflow testing | QA/Dev |
| 5 | Fix any blocking issues | Dev |

### Week 2 (Feb 13-19): Polish
| Day | Task | Owner |
|-----|------|-------|
| 1-2 | Loading states | Dev |
| 2-3 | Empty states | Dev |
| 4 | Error boundaries | Dev |
| 5 | Mobile testing | QA |

### Week 3 (Feb 20-26): Final Testing
| Day | Task | Owner |
|-----|------|-------|
| 1-2 | End-to-end testing | QA |
| 3 | Performance testing | Dev |
| 4 | Security audit | Dev |
| 5 | Bug fixes | Dev |

### Week 4 (Feb 27-Mar 5): Launch Prep
| Day | Task | Owner |
|-----|------|-------|
| 1 | Production environment setup | DevOps |
| 2 | Final deployment test | Dev |
| 3 | Documentation review | PM |
| 4 | Soft launch (beta users) | Team |
| 5 | Public launch! | Team |

---

## 🎯 SUCCESS CRITERIA

### Technical
- [ ] Build passes ✅
- [ ] Zero console errors in production
- [ ] All API routes < 500ms response time
- [ ] Mobile-responsive on iOS/Android

### Functional
- [ ] Signup → Onboarding → First job flow works
- [ ] Payment processing end-to-end
- [ ] Real-time updates functional
- [ ] Email notifications sending

### Business
- [ ] First paying customer onboarded
- [ ] Subscription billing working
- [ ] Support process established

---

## 🚨 RISK MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe issues | HIGH | Test thoroughly, have manual fallback |
| Email delivery | MEDIUM | Use Resend dev mode, monitor bounce rates |
| Mobile UX issues | MEDIUM | Test early, fix critical issues |
| Performance at scale | LOW | Monitor, optimize post-launch |

---

## 📊 EFFORT SUMMARY

| Priority | Hours | Tasks |
|----------|-------|-------|
| P1 - Must Fix | 12-18 | Console logs, Stripe test, Core workflows |
| P2 - Should Fix | 13-19 | Loading states, Empty states, Mobile |
| P3 - Nice to Have | 15-21 | SMS, Shortcuts, Performance |
| **Total** | **40-58** | ~6-10 hours/week for 4 weeks |

---

## 🎬 NEXT ACTIONS (Do Today)

1. **Review this plan** - Confirm priorities and timeline
2. **Set up Stripe test environment** - Get test keys ready
3. **Create test checklist** - Document all scenarios to test
4. **Assign owners** - Who does what

---

**Questions to resolve:**
1. Do you have Stripe account set up with products?
2. Do you have Resend account with domain verified?
3. Do you have Google Maps API key?
4. What's your target launch date specifically?
5. Do you have beta users ready to test?

*This plan assumes 1 developer working part-time. Adjust based on your actual capacity.*
