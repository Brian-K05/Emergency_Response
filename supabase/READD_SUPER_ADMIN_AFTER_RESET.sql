-- ============================================
-- RE-ADD SUPER ADMIN PROFILE (run after RESET_DATABASE_FRESH.sql)
-- ============================================
-- 1. In Supabase: Authentication > Users > find your super admin email
-- 2. Copy the User UID (UUID)
-- 3. Replace the UUID below with that UID, then run this script.
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
    '27564027-3655-4f74-a11f-02d44556547e'::uuid,  -- REPLACE with your Super Admin UUID from Auth > Users
    'superadmin',
    'emergencyresponse488@gmail.com',               -- use the same email as in Auth
    'Super Administrator',
    'super_admin',
    '09705406985',
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
