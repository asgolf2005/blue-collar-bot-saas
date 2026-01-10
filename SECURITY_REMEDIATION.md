# Security Remediation Guide

## 🚨 CRITICAL: Credential Rotation Required

Your production credentials have been exposed in version control and must be rotated **immediately**.

---

## Step 1: Rotate Supabase Credentials

### 1.1 Rotate Anon Key (Public)
While the anon key is public-facing, it's best practice to rotate it:

1. Go to https://app.supabase.com
2. Select your project: `ckxrvlbiclloxrcevjpv`
3. Navigate to **Settings → API**
4. Click **"Regenerate Anon Key"** (Note: This is rarely needed as RLS protects your data)

### 1.2 Rotate Service Role Key (CRITICAL)
This is the most important credential to rotate:

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Settings → API**
4. **Contact Supabase support** to rotate the service role key
   - Service role keys cannot be self-rotated from the dashboard
   - Email: support@supabase.com
   - Subject: "Emergency Service Role Key Rotation - Project ckxrvlbiclloxrcevjpv"
   - Explain: "Service role key was accidentally committed to git"

**Temporary Workaround:**
If immediate rotation is critical, create a new Supabase project and migrate your database.

---

## Step 2: Rotate Third-Party API Keys

### 2.1 Google Maps API Key
1. Go to https://console.cloud.google.com/google/maps-apis
2. Navigate to **Credentials**
3. Find API key: `AIzaSyB3PF-zHleVnLZSBfMeKr-CyqLr5EWUYiQ`
4. Click **Delete** to revoke it
5. Click **Create Credentials → API Key** to generate new one
6. Add restrictions:
   - **Application restrictions**: HTTP referrers
   - **API restrictions**: Maps JavaScript API, Geocoding API, Places API
   - **HTTP referrer restrictions**: Add your production domain

### 2.2 Resend API Key
1. Go to https://resend.com/api-keys
2. Find key: `re_7t8kR6Xj_6HCEwSEzVEMyfdt2TQnKcwe4`
3. Click **Delete** to revoke it
4. Click **Create API Key** to generate new one
5. Update your `.env.local` and deployment environment

### 2.3 n8n Webhook Secret
1. Generate a new secure secret:
   ```bash
   openssl rand -base64 32
   ```
2. Update both:
   - Your `.env.local` file
   - Your n8n workflow configuration

### 2.4 Stripe Keys (if configured)
1. Go to https://dashboard.stripe.com/apikeys
2. Click **Reveal test/live key** to view current keys
3. If they were exposed, click **Roll key** to regenerate
4. Update your environment variables

---

## Step 3: Remove Credentials from Git History

The `.env.local` file was committed to your repository. You must remove it from git history:

### Option A: Using BFG Repo-Cleaner (Recommended)

```bash
# 1. Download BFG
# Visit: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Clone a fresh copy
git clone --mirror https://github.com/yourusername/blue-collar-bot-saas.git

# 3. Remove .env.local from history
java -jar bfg.jar --delete-files .env.local blue-collar-bot-saas.git

# 4. Clean up
cd blue-collar-bot-saas.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (WARNING: Destructive)
git push --force
```

### Option B: Using git filter-branch

```bash
# Remove .env.local from entire git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Destructive)
git push --force --all
git push --force --tags
```

### Option C: Nuclear Option (Start Fresh)

If the repository is new or you can afford to lose history:

```bash
# 1. Remove git history
rm -rf .git

# 2. Initialize new repository
git init

# 3. Ensure .gitignore is correct
cat .gitignore # Verify .env*.local is listed

# 4. Make initial commit
git add .
git commit -m "Initial commit (post-security remediation)"

# 5. Force push to remote
git remote add origin https://github.com/yourusername/blue-collar-bot-saas.git
git push -u origin master --force
```

---

## Step 4: Update Environment Variables

### 4.1 Local Development

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your NEW credentials:
   ```bash
   # Use your new rotated credentials
   NEXT_PUBLIC_SUPABASE_URL=https://ckxrvlbiclloxrcevjpv.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
   N8N_WEBHOOK_SECRET=<NEW_WEBHOOK_SECRET>
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<NEW_MAPS_KEY>
   RESEND_API_KEY=<NEW_RESEND_KEY>
   # ... etc
   ```

3. Verify `.env.local` is in `.gitignore`:
   ```bash
   grep -E "^\.env.*\.local$" .gitignore
   # Should output: .env*.local
   ```

### 4.2 Production Deployment (Vercel)

1. Go to https://vercel.com → Your Project → Settings → Environment Variables
2. Delete all existing environment variables
3. Add new variables with rotated credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `N8N_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - (Optional) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

4. Redeploy your application:
   ```bash
   git push origin master  # Triggers automatic deployment
   ```

---

## Step 5: Verify Security Fixes

### 5.1 Test Middleware Protection

```bash
# Test admin route without auth (should redirect to login)
curl -I http://localhost:3000/admin/jobs

# Test customer route without auth (should redirect to login)
curl -I http://localhost:3000/customer
```

### 5.2 Test API Authentication

```bash
# Test invoice creation without auth (should return 401)
curl -X POST http://localhost:3000/api/invoices/create \
  -H "Content-Type: application/json" \
  -d '{"business_id":"test","job_id":"test","customer_id":"test","line_items":[]}'

# Should return: {"error":"Unauthorized"}
```

### 5.3 Test Seed Endpoint Protection

```bash
# Test seed endpoint without secret (should return 401)
curl -X POST http://localhost:3000/api/seed

# Test seed endpoint with correct secret
curl -X POST http://localhost:3000/api/seed \
  -H "Authorization: Bearer dev-only-seed-secret"
```

### 5.4 Test Input Validation

```bash
# Test webhook with invalid phone number (should return 400)
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Authorization: Bearer YOUR_N8N_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "invalid-uuid",
    "customer_name": "Test",
    "customer_phone": "abc",
    "scheduled_start": "2024-01-01T10:00:00Z",
    "scheduled_end": "2024-01-01T11:00:00Z"
  }'

# Should return validation errors
```

---

## Step 6: Notify Stakeholders

If this is a production application:

1. **Notify your team** about the credential rotation
2. **Update any CI/CD pipelines** with new secrets
3. **Update n8n workflows** with new webhook URL/secret
4. **Check application logs** for any suspicious activity during exposure period
5. **Monitor Supabase audit logs** for unauthorized access

---

## Step 7: Implement Additional Security Measures

### 7.1 Add .env.local to .gitignore (Already Done)
Already configured in `.gitignore`:
```
.env*.local
.env
```

### 7.2 Add Pre-commit Hook to Prevent Credential Commits

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for potential secrets
if git diff --cached --name-only | grep -q "\.env\.local"; then
  echo "ERROR: Attempting to commit .env.local file!"
  echo "This file contains secrets and should never be committed."
  exit 1
fi

# Check for potential API keys in staged files
if git diff --cached | grep -E "(SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|STRIPE_SECRET_KEY|TWILIO_AUTH_TOKEN)"; then
  echo "WARNING: Potential API key detected in staged changes!"
  echo "Please review your commit carefully."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 7.3 Use Git-secrets (Optional)

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
apt-get install git-secrets  # Linux

# Setup
cd your-repo
git secrets --install
git secrets --register-aws
git secrets --add 'SUPABASE_SERVICE_ROLE_KEY'
git secrets --add 'RESEND_API_KEY'
git secrets --add 'STRIPE_SECRET_KEY'
```

---

## Step 8: Database Security Audit

### 8.1 Review Supabase RLS Policies

1. Go to https://app.supabase.com → Your Project → Authentication → Policies
2. Verify all tables have Row Level Security (RLS) enabled
3. Check that policies properly restrict access by `business_id`

### 8.2 Review Database Logs

1. Go to Supabase → Logs → Database Logs
2. Look for suspicious queries during credential exposure period
3. Check for:
   - Unexpected bulk data exports
   - Unusual query patterns
   - Access from unknown IP addresses

### 8.3 Check for Data Breaches

1. Review customer data for any unauthorized changes
2. Check invoice records for tampering
3. Verify no unauthorized admin accounts created

---

## Step 9: Document the Incident

Create an internal security incident report:

```markdown
# Security Incident Report

**Date:** 2024-01-10
**Type:** Credential Exposure
**Severity:** CRITICAL

## What Happened
Production credentials were accidentally committed to git repository in:
- .env.local (exposed Supabase, Google Maps, Resend API keys)
- next.config.js (hardcoded Supabase credentials)
- .env.example (contained real credentials instead of placeholders)

## Exposure Timeline
- Committed: [DATE OF FIRST COMMIT]
- Discovered: 2024-01-10
- Remediated: 2024-01-10

## Actions Taken
1. ✅ Rotated all exposed credentials
2. ✅ Removed credentials from git history
3. ✅ Added security middleware
4. ✅ Implemented input validation
5. ✅ Secured seed endpoints
6. ✅ Updated .env.example with placeholders
7. ✅ Added pre-commit hooks

## Lessons Learned
- Always use .env.local for local secrets (already gitignored)
- Never hardcode credentials in config files
- Regularly audit repository for exposed secrets
- Use git-secrets or similar tools

## Prevention Measures
- Pre-commit hooks installed
- Team training on secret management
- Regular security audits scheduled
```

---

## Summary Checklist

- [ ] Rotated Supabase service role key
- [ ] Rotated Google Maps API key
- [ ] Rotated Resend API key
- [ ] Rotated n8n webhook secret
- [ ] Removed .env.local from git history
- [ ] Updated local .env.local with new credentials
- [ ] Updated production environment variables
- [ ] Verified .env.local is in .gitignore
- [ ] Tested middleware protection
- [ ] Tested API authentication
- [ ] Installed pre-commit hooks
- [ ] Reviewed database logs for suspicious activity
- [ ] Notified team members
- [ ] Documented incident
- [ ] Updated n8n workflows with new webhook secret

---

## Emergency Contacts

- **Supabase Support:** support@supabase.com
- **Stripe Support:** https://support.stripe.com/
- **Resend Support:** support@resend.com
- **Google Cloud Support:** https://cloud.google.com/support

---

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
