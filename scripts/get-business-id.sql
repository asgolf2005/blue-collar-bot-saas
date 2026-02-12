-- =====================================================
-- GET YOUR BUSINESS ID
-- Run this in Supabase SQL Editor to find your business UUID
-- =====================================================

-- Option 1: List all businesses (for administrators)
SELECT 
    id AS business_id,
    name AS business_name,
    email,
    phone,
    created_at
FROM public.businesses
ORDER BY created_at DESC;

-- Option 2: If you know your business name
-- SELECT id FROM public.businesses WHERE name ILIKE '%your business name%';

-- Option 3: Get business ID for a specific user
-- SELECT b.id, b.name 
-- FROM public.businesses b
-- JOIN public.users u ON u.business_id = b.id
-- WHERE u.email = 'your-email@example.com';
