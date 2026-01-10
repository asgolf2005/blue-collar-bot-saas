-- Quick test: Insert a fake tech location
-- Replace YOUR_TECH_USER_ID with actual tech user ID from your database

INSERT INTO technician_locations (
  technician_id,
  latitude,
  longitude,
  accuracy,
  speed,
  recorded_at
) VALUES (
  'YOUR_TECH_USER_ID',
  37.7749,  -- San Francisco latitude
  -122.4194, -- San Francisco longitude
  10.0,
  5.0,
  NOW()
);

-- Then check the admin dashboard - you should see this location on the map!
