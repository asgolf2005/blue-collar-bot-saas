# Create Technician User Manually

If the tech accounts don't exist yet, here's how to create one:

## Option 1: Run Seed Script (Easiest)

```bash
# This creates all demo data including techs
node seed-full-month-data.js
```

This creates:
- ✅ 1 Admin user
- ✅ 3 Technician users (Alex, Sarah, David)
- ✅ 15 Customers
- ✅ 10 Services
- ✅ Full month of jobs

---

## Option 2: Create Tech User via Supabase Dashboard

### Step 1: Create Auth User
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - **Email**: `alex@proplumbing.com`
   - **Password**: `tech123`
   - Check "Auto Confirm User"
4. Click **"Create user"**
5. Copy the **User ID** (you'll need it)

### Step 2: Add to Users Table
1. Go to **Table Editor** → **users** table
2. Click **"Insert"** → **"Insert row"**
3. Fill in:
   ```
   id: [paste User ID from step 1]
   business_id: [your business ID - get from businesses table]
   email: alex@proplumbing.com
   full_name: Alex Rivera
   phone: +1-555-200-0001
   role: tech
   ```
4. Click **"Save"**

### Step 3: Test Login
1. Go to http://localhost:3001/login
2. Email: `alex@proplumbing.com`
3. Password: `tech123`
4. Should redirect to `/tech/today`

---

## Option 3: Quick SQL Script

Run this in Supabase SQL Editor:

```sql
-- First, you need to create the auth user manually in Supabase Auth UI
-- Then use their ID here

-- Get your business_id first
SELECT id, name FROM businesses LIMIT 1;

-- Insert tech user (replace the UUIDs)
INSERT INTO users (id, business_id, email, full_name, phone, role)
VALUES (
  'AUTH_USER_ID_HERE',  -- Replace with auth user ID
  'YOUR_BUSINESS_ID_HERE',  -- Replace with your business ID
  'alex@proplumbing.com',
  'Alex Rivera',
  '+1-555-200-0001',
  'tech'
);
```

---

## Verify Tech User Exists

Run this SQL in Supabase:

```sql
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  b.name as business_name
FROM users u
LEFT JOIN businesses b ON b.id = u.business_id
WHERE u.role = 'tech';
```

Should return:
- Alex Rivera (alex@proplumbing.com)
- Sarah Williams (sarah@proplumbing.com)
- David Brown (david@proplumbing.com)

If empty, the users don't exist yet - run the seed script!

---

## Common Issues

### "Invalid login credentials"
- User doesn't exist in Supabase Auth
- Run seed script or create user manually

### "User not found" after login
- Auth user exists but not in `users` table
- Add user to `users` table with role='tech'

### Redirects to admin instead of tech portal
- User has role='admin' instead of role='tech'
- Update role in users table:
  ```sql
  UPDATE users SET role = 'tech' WHERE email = 'alex@proplumbing.com';
  ```

---

## All Test Accounts Summary

After running seed script, you'll have:

| Name | Email | Password | Role |
|------|-------|----------|------|
| John Administrator | admin@proplumbing.com | admin123 | admin |
| Alex Rivera | alex@proplumbing.com | tech123 | tech |
| Sarah Williams | sarah@proplumbing.com | tech123 | tech |
| David Brown | david@proplumbing.com | tech123 | tech |

