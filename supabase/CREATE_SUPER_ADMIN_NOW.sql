-- ============================================
-- CREATE SUPER ADMIN (use when you have no users)
-- ============================================
-- STEP 1: Create the Auth user in Supabase Dashboard first
--   - Go to: Authentication > Users > "Add user" > "Create new user"
--   - Email: (e.g. emergencyresponse488@gmail.com)
--   - Password: (choose a strong password – you'll use this to log in)
--   - Check "Auto Confirm User"
--   - Click "Create user"
--
-- STEP 2: Copy the new user's "User UID" (UUID) from the user row
--
-- STEP 3: Below, replace:
--   - YOUR_AUTH_USER_UUID_HERE  →  the UUID you copied
--   - your@email.com            →  the same email you used in Step 1
--   - YourPhoneOptional         →  your phone (or NULL)
--
-- STEP 4: Run this script in SQL Editor
-- ============================================

INSERT INTO public.users (
    id,
    username,
    email,
    full_name,
    role,
    phone_number,
    municipality_id,
    barangay_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    'YOUR_AUTH_USER_UUID_HERE'::uuid,
    'superadmin',
    'your@email.com',
    'Super Administrator',
    'super_admin',
    NULL,
    NULL,
    NULL,
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    full_name = 'Super Administrator',
    is_active = TRUE,
    updated_at = NOW();

-- Verify:
SELECT id, username, email, full_name, role FROM public.users WHERE role = 'super_admin';
