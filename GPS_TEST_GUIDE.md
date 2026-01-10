# GPS Tracking - Test Guide

Step-by-step instructions to test GPS tracking on your local dev environment.

---

## ⚙️ Prerequisites

1. **Google Maps API Key** added to `.env.local`
2. **Dev server running** (`npm run dev`)
3. **Two browser windows** (or use Chrome + Incognito mode)
4. **Test data:**
   - At least 1 tech user account
   - At least 1 job assigned to that tech
   - Job status can be any status (you'll change it to "on_the_way")

---

## 🧪 Test Scenario: Track a Tech on the Way to a Job

### Step 1: Set Up (2 minutes)

**Window 1 (Tech):**
1. Login as a **tech** user
2. Navigate to **Tech Dashboard** (`/tech/today`)
3. Find a job or create one
4. Open the job details

**Window 2 (Admin):**
1. Login as an **admin** user (different browser or incognito)
2. Navigate to **Jobs Dashboard** (`/admin/jobs`)
3. You should see the jobs table
4. Scroll down - you'll see **"Live Technician Locations"** map (empty for now)

---

### Step 2: Tech Starts Sharing Location (1 minute)

**In Window 1 (Tech):**

1. On the job detail page, find the **Status Buttons**
2. Click **"On The Way"** button
3. Wait 1-2 seconds for status to update
4. You should now see a new card appear: **"Location Sharing"**

**What you'll see:**
```
┌─────────────────────────────────────┐
│ 📍 Location Sharing                  │
│                                      │
│ [ 🎯 Start Sharing Location ]       │
│                                      │
│ Status: Not sharing                  │
└─────────────────────────────────────┘
```

5. Click **"Start Sharing Location"** button

**Browser will prompt:**
```
─────────────────────────────────────
  [Your Site] wants to:

  📍 Know your location

  [Block]  [Allow]
─────────────────────────────────────
```

6. Click **"Allow"**

**What happens:**
- Button turns green with checkmark: ✅
- You'll see: "Status: ✅ Sharing location"
- "Last update: Just now"
- "Accuracy: X meters"
- Console log: "Location sent successfully"

---

### Step 3: Verify Location on Admin Map (30 seconds)

**In Window 2 (Admin):**

1. Look at the **"Live Technician Locations"** map
2. You should see:
   - Map loads (Google Maps)
   - A **blue circle marker** appears at your location
   - Text shows: "🚗 1 technician sharing location"

3. **Click the blue marker on the map**

**Popup shows:**
```
┌────────────────────────┐
│ John Smith (Tech Name) │
│ Last updated: Just now │
│ Speed: 0 mph          │
└────────────────────────┘
```

4. Scroll down to **"Technicians (1)"** section

**You'll see:**
```
┌────────────────────────────┐
│ 🔵 John Smith    Just now  │
└────────────────────────────┘
```

5. Click **"John Smith"** in the list

**What happens:**
- Map zooms to tech's location
- Marker stays in center

---

### Step 4: Test Auto-Update (1 minute)

**In Window 1 (Tech):**

1. Keep the job page open
2. Move your device (laptop, phone) to a different location
   - Walk to another room
   - Or if testing on desktop, location won't change much

**In Window 2 (Admin):**

1. Wait 10-30 seconds (auto-update interval)
2. Watch the map:
   - Marker position may update (if you moved)
   - "Last update" time changes to "Just now" again
   - If you're moving: "Speed: X mph" shows current speed

3. Click **"Refresh"** button (top right of map) to force update

---

### Step 5: Test Stop Sharing (30 seconds)

**In Window 1 (Tech):**

1. Click **"🛑 Stop Sharing Location"** button

**What happens:**
- Button changes back to "Start Sharing Location"
- Status shows: "Not sharing"
- Last update shows last timestamp

**In Window 2 (Admin):**

1. Wait 30 seconds (next auto-refresh)
2. Or click "Refresh" button
3. Tech's marker disappears from map
4. Count shows: "🚗 0 technicians sharing location"
5. Message appears: "No active technicians - Techs will appear here when they share their location"

---

## 🐛 Troubleshooting

### Issue: "Failed to load map"

**Cause:** Google Maps API key not set or invalid

**Fix:**
1. Check `.env.local` has:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```
2. Verify API key is valid
3. Check Google Cloud Console:
   - Maps JavaScript API enabled
   - API key restrictions allow `localhost:3000`
4. Restart dev server: `npm run dev`

---

### Issue: Browser blocks location permission

**Cause:** Browser privacy settings

**Fix:**
1. Chrome: Settings → Privacy → Site Settings → Location
2. Firefox: Preferences → Privacy & Security → Permissions → Location
3. Allow location for `http://localhost:3000`
4. Or use HTTPS (location API requires secure context)

---

### Issue: Tech marker not appearing on map

**Cause:** Location not being sent to API

**Fix:**
1. Open browser console (F12)
2. Look for errors:
   - Red error messages
   - Failed network requests to `/api/tracking/location`
3. Check Network tab:
   - Should see POST to `/api/tracking/location` every 10-30s
   - Response should be 200 OK
4. Verify tech has permission:
   - Tech user role must be 'tech' in database
   - Check `users` table: `role = 'tech'`

---

### Issue: "Technician location not available" error

**Cause:** Location data not in database

**Fix:**
1. Check `technician_locations` table in Supabase dashboard
2. Verify rows exist:
   ```sql
   SELECT * FROM technician_locations
   ORDER BY recorded_at DESC
   LIMIT 10;
   ```
3. If empty, location sharing isn't working - see issue above

---

## 📊 Expected Data Flow

1. **Tech clicks "Start Sharing"**
   - Browser gets GPS coordinates
   - Sends POST to `/api/tracking/location`
   - API inserts into `technician_locations` table

2. **Admin views map**
   - Component calls GET `/api/tracking/location`
   - API calls `get_latest_tech_locations(business_id)`
   - Returns latest location for each tech

3. **Auto-updates**
   - Tech: Every 10-30 seconds, POST new location
   - Admin: Every 30 seconds, fetch latest locations
   - Supabase Realtime: Pushes changes instantly (optional)

---

## 🎯 Success Criteria

✅ Tech can start/stop location sharing
✅ Admin sees tech marker on map within 10 seconds
✅ Clicking marker shows tech info popup
✅ Map auto-updates every 30 seconds
✅ Multiple techs can share location simultaneously
✅ Location stops when tech clicks "Stop" or closes browser

---

## 🔍 Database Verification

Check data is being saved:

```sql
-- See all recent tech locations
SELECT
  tl.*,
  u.full_name as tech_name,
  j.id as job_id
FROM technician_locations tl
LEFT JOIN users u ON u.id = tl.technician_id
LEFT JOIN jobs j ON j.id = tl.job_id
ORDER BY tl.recorded_at DESC
LIMIT 20;
```

Expected result:
```
┌──────────────────────────────────────────────────────────┐
│ id          │ tech_name    │ lat      │ lng       │ ...  │
├──────────────────────────────────────────────────────────┤
│ uuid-123... │ John Smith   │ 37.7749  │ -122.4194 │ ...  │
│ uuid-456... │ John Smith   │ 37.7750  │ -122.4195 │ ...  │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Advanced Testing

### Test 1: Multiple Techs

1. Create 2-3 tech user accounts
2. Open each in separate browser/incognito window
3. Have each start sharing location
4. Admin should see all techs on map

### Test 2: Speed Tracking

1. Open tech view on phone (not desktop)
2. Start sharing location
3. Drive/walk around while sharing
4. Check admin view - should show speed

### Test 3: ETA Calculation

1. Tech shares location while on_the_way to job
2. Customer views job details (if you have customer portal)
3. Should see: "Technician is X minutes away"

### Test 4: Offline Handling

1. Tech starts sharing location
2. Turn off WiFi/disconnect internet
3. Should see error message
4. Reconnect - should resume automatically

---

## 📸 Screenshots

Take screenshots at these points:

1. ✅ Tech job page with "Location Sharing" card
2. ✅ Location permission prompt
3. ✅ Active sharing status (green checkmark)
4. ✅ Admin map with tech marker visible
5. ✅ Marker popup with tech details
6. ✅ Multiple techs on map

---

## ✅ Final Checklist

Before calling it "done":

- [ ] Tech can share location
- [ ] Admin can see location on map
- [ ] Map updates automatically
- [ ] Works on mobile browser
- [ ] Works with multiple techs
- [ ] Location stops when sharing stopped
- [ ] No console errors
- [ ] Google Maps loads correctly
- [ ] Marker click shows info popup
- [ ] Tech list click zooms to location

---

**Testing complete? You now have GPS tracking that rivals ServiceTitan! 🎉**
