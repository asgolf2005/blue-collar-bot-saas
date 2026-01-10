# Credential Rotation Checklist

**Date Started:** 2024-01-10
**Status:** 🔄 IN PROGRESS

---

## ✅ Automatically Rotated (DONE)

- [x] **N8N_WEBHOOK_SECRET** → New value: `RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=`
- [x] **SEED_SECRET** → New value: `jE9MwiOPNrKaTyIneGBdN/wfSbtFsb+zzMonHdScUdM=`

---

## 🔄 Manual Rotation Required

### 1. Supabase Keys (CRITICAL - Do First)

**Status:** ⏳ PENDING

#### Why This Matters
The service role key gives full database admin access. This is the most critical credential to rotate.

#### Steps to Rotate

**Option A: Contact Supabase Support (Recommended for Service Role)**
```
1. Email: support@supabase.com
2. Subject: "Service Role Key Rotation Request - Project ckxrvlbiclloxrcevjpv"
3. Body: "Hello, I need to rotate my service role key as it was accidentally
   exposed in version control. Project ID: ckxrvlbiclloxrcevjpv"
4. They will respond with instructions (usually within 24 hours)
```

**Option B: Self-Rotate Anon Key**
```
1. Go to: https://app.supabase.com/project/ckxrvlbiclloxrcevjpv/settings/api
2. Look for "Project API keys" section
3. The Anon key is publicly visible - check if it has a "Regenerate" button
   (Note: Some Supabase plans don't allow self-rotation)
4. Copy the NEW anon key
5. Paste into .env.local → NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Current Values (EXPOSED - DO NOT USE):**
- ❌ Old Anon Key: `eyJhbG...X2M` (exposed)
- ❌ Old Service Role: `eyJhbG...uYs` (exposed)

**Checklist:**
- [ ] Contacted Supabase support OR regenerated keys
- [ ] Received new service role key
- [ ] Updated `.env.local` with new keys
- [ ] Tested local development still works
- [ ] Updated production environment variables (Vercel/deployment platform)

---

### 2. Google Maps API Key

**Status:** ⏳ PENDING

#### Steps to Rotate
```
1. Go to: https://console.cloud.google.com/google/maps-apis/credentials
2. Find existing key ending in "...EWUYiQ"
3. Click the key name to view details
4. Click "DELETE" button (or "Restrict" if you prefer to restrict instead)
5. Click "CREATE CREDENTIALS" → "API key"
6. Copy the new API key immediately
7. Click "RESTRICT KEY" and add:
   - Application restrictions: HTTP referrers (websites)
   - Website restrictions:
     - http://localhost:3000/*
     - https://yourdomain.com/*
   - API restrictions:
     - Maps JavaScript API
     - Geocoding API
     - Places API
8. Click "SAVE"
9. Paste new key into .env.local → NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

**Current Value (EXPOSED - DO NOT USE):**
- ❌ Old Key: `AIzaSyB3PF-zHleVnLZSBfMeKr-CyqLr5EWUYiQ`

**Checklist:**
- [ ] Logged into Google Cloud Console
- [ ] Deleted old API key
- [ ] Created new API key
- [ ] Added restrictions (HTTP referrers, API limits)
- [ ] Updated `.env.local` with new key
- [ ] Tested Google Maps features still work (address autocomplete, ETA)
- [ ] Updated production environment variables

---

### 3. Resend API Key

**Status:** ⏳ PENDING

#### Steps to Rotate
```
1. Go to: https://resend.com/login
2. Navigate to "API Keys" section
3. Find key starting with "re_7t8kR6Xj..."
4. Click "Delete" or trash icon
5. Click "Create API Key"
6. Name it: "Blue Collar Bot Production" (or similar)
7. Copy the key immediately (shown only once!)
8. Paste into .env.local → RESEND_API_KEY
```

**Current Value (EXPOSED - DO NOT USE):**
- ❌ Old Key: `re_7t8kR6Xj_6HCEwSEzVEMyfdt2TQnKcwe4`

**Checklist:**
- [ ] Logged into Resend
- [ ] Deleted old API key
- [ ] Created new API key
- [ ] Saved new key to `.env.local`
- [ ] Tested email sending (create test invoice)
- [ ] Updated production environment variables

---

### 4. Update n8n Workflow

**Status:** ⏳ PENDING

#### Steps to Update
```
1. Open your n8n workflow editor
2. Find the webhook node that calls your app
3. Update the Authorization header to:
   Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=
4. Save the workflow
5. Test the webhook with a test call
```

**New Webhook Secret:**
```
RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=
```

**Checklist:**
- [ ] Opened n8n workflow
- [ ] Updated Authorization header with new secret
- [ ] Saved workflow
- [ ] Tested webhook call successfully creates job

---

### 5. Production Environment Variables (Vercel/Hosting)

**Status:** ⏳ PENDING

#### Steps to Update

**If using Vercel:**
```
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Update these variables with NEW values:
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   - RESEND_API_KEY
   - N8N_WEBHOOK_SECRET
5. Click "Save"
6. Go to Deployments tab
7. Click "Redeploy" on latest deployment
```

**If using other platform:**
- Follow your platform's environment variable update process
- Ensure all new values are updated
- Trigger a redeploy

**Checklist:**
- [ ] Updated all environment variables in production
- [ ] Triggered production redeploy
- [ ] Verified production app still works
- [ ] Tested critical features (login, invoice creation, n8n webhook)

---

## 🧪 Testing Checklist

After rotating credentials, test these features:

### Local Development Tests
- [ ] `npm run dev` starts without errors
- [ ] Login works with test account
- [ ] Admin dashboard loads
- [ ] Can create a test customer
- [ ] Can create a test job
- [ ] Google Maps address autocomplete works
- [ ] Can create and send test invoice (email should send)
- [ ] n8n webhook test creates job successfully

### Production Tests
- [ ] Production site loads
- [ ] Login works
- [ ] Dashboard loads with real data
- [ ] Email notifications send correctly
- [ ] n8n webhook integration works

---

## 🗑️ Git History Cleanup (CRITICAL)

**Status:** ⏳ PENDING - DO AFTER ROTATION

The `.env.local` file with old credentials is still in git history. You MUST clean it.

### Quick Option: Using BFG Repo-Cleaner

```bash
# 1. Install BFG (if not installed)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Create backup of your repo first!
cd ..
git clone --mirror https://github.com/yourusername/blue-collar-bot-saas.git backup-repo.git

# 3. Clone fresh mirror
git clone --mirror https://github.com/yourusername/blue-collar-bot-saas.git

# 4. Remove .env.local from history
java -jar bfg.jar --delete-files .env.local blue-collar-bot-saas.git

# 5. Clean up
cd blue-collar-bot-saas.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Force push (WARNING: This rewrites history!)
git push --force
```

**⚠️ WARNING:** This rewrites git history. Coordinate with your team first!

**Checklist:**
- [ ] Created backup of repository
- [ ] Ran BFG or filter-branch to remove .env.local
- [ ] Force pushed cleaned history
- [ ] Verified .env.local not in git history: `git log --all --full-history -- .env.local`
- [ ] Team members re-cloned repository

---

## 📊 Progress Summary

**Completed:** 2/7 steps (29%)

**Automatically Done:**
- ✅ Generated new N8N_WEBHOOK_SECRET
- ✅ Generated new SEED_SECRET

**Requires Your Action:**
- ⏳ Rotate Supabase keys
- ⏳ Rotate Google Maps API key
- ⏳ Rotate Resend API key
- ⏳ Update n8n workflow
- ⏳ Update production environment variables
- ⏳ Clean git history

---

## 🆘 Need Help?

**If you get stuck:**

1. **Supabase Issues:** support@supabase.com
2. **Google Cloud Issues:** https://cloud.google.com/support
3. **Resend Issues:** support@resend.com
4. **Git History Issues:** See SECURITY_REMEDIATION.md for detailed instructions

---

## ✅ Final Verification

Once all steps are complete, verify:

```bash
# 1. Check .env.local has no placeholder text
grep "REPLACE_WITH_NEW" .env.local
# Should return nothing

# 2. Test local development
npm run dev

# 3. Test production
# Visit your production URL and test login/features

# 4. Check git history is clean
git log --all --full-history -- .env.local
# Should show "fatal: bad revision" or no results
```

---

**Started:** 2024-01-10
**Target Completion:** Within 24 hours
**Estimated Time:** 30-60 minutes of active work
