# Website Improvements Plan
## No Paid Services Required

---

## 📊 Audit Summary

### Phase 1: Loading & Empty States (Start Here)
| Page | Issue | Priority |
|------|-------|----------|
| `/admin/jobs/new` | Missing loading.tsx | 🔴 HIGH |
| `/tech/jobs/[id]` | Missing loading.tsx | 🔴 HIGH |
| `/tech/stats` | Missing empty state | 🔴 HIGH |
| `/tech/customers/[id]` | Missing loading.tsx | 🟡 MEDIUM |
| `RevenueChart` | Missing empty state | 🟡 MEDIUM |
| Dashboard cards | Missing empty states | 🟡 MEDIUM |

### Phase 2: Forms & Validation
| Form | Issue | Priority |
|------|-------|----------|
| `CreateInvoiceForm` | No success feedback, inconsistent styling | 🔴 HIGH |
| `NewCustomerForm` | No success feedback | 🔴 HIGH |
| `NewJobForm` | No date/time validation | 🟡 MEDIUM |
| All forms | No email validation | 🟡 MEDIUM |
| `EditCustomerForm` | Native confirm() for delete | 🟢 LOW |

### Phase 3: Mobile Responsiveness
| Component | Issue | Priority |
|-----------|-------|----------|
| `JobsTable` | Table doesn't adapt to mobile | 🔴 HIGH |
| `CustomerTable` | Table doesn't adapt, nowrap abuse | 🔴 HIGH |
| Touch targets | Too small (< 44px) | 🟡 MEDIUM |

### Phase 4: Error Handling
| Task | Priority |
|------|----------|
| Add error boundaries | 🟡 MEDIUM |
| Improve API error messages | 🟡 MEDIUM |

---

## 🎯 Execution Order

### Week 1: Loading States (Most Visible Impact)
1. Create loading.tsx for `/admin/jobs/new`
2. Create loading.tsx for `/tech/jobs/[id]`
3. Add empty state to `/tech/stats`
4. Add empty state to `RevenueChart`

### Week 2: Forms
1. Add success feedback to `CreateInvoiceForm`
2. Add success feedback to `NewCustomerForm`
3. Add date/time validation to `NewJobForm`
4. Standardize form styling

### Week 3: Mobile
1. Convert `JobsTable` to cards on mobile
2. Convert `CustomerTable` to cards on mobile
3. Fix touch target sizes

### Week 4: Polish
1. Add error boundaries
2. Improve error messages
3. Final testing

---

## ✅ Immediate Actions (Today)

Let me start with the highest impact items:
