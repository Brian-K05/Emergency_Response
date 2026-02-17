-- ============================================
-- CREATE SUPER ADMIN ACCOUNT
-- ============================================
-- This script creates a super admin account manually
-- Run this in Supabase SQL Editor after setting up the database
-- ============================================

-- First, update the schema to allow super_admin and municipal_admin roles
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('super_admin', 'municipal_admin', 'admin', 'mdrrmo', 'responder', 'barangay_official', 'resident'));

-- ============================================
-- STEP 1: Create Super Admin Auth User
-- ============================================
-- You need to create the auth user first through Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Enter:
--    - Email: superadmin@emergencyresponse.local (or your email)
--    - Password: [Create a strong password]
--    - Auto Confirm User: YES (check this)
-- 4. Click "Create user"
-- 5. Copy the User ID (UUID) from the created user
-- 6. Replace 'YOUR_USER_ID_HERE' below with that UUID

-- ============================================
-- STEP 2: Create Super Admin Profile
-- ============================================
-- Replace 'YOUR_USER_ID_HERE' with the UUID from step 1
-- Replace email and other details as needed

INSERT INTO public.users (
    id,
    username,
    email,
    full_name,
    role,
    phone_number,
    municipality_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    '27564027-3655-4f74-a11f-02d44556547e'::uuid,  -- Replace with actual UUID from Supabase Auth
    'superadmin',
    'emergencyresponse488@gmail.com',  -- Replace with your email
    'Super Administrator',
    'super_admin',
    '09705406985',  -- Replace with your phone number
    NULL,  -- Super admin doesn't belong to a specific municipality
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    is_active = TRUE,
    updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify the super admin was created:
SELECT id, username, email, full_name, role, is_active 
FROM public.users 
WHERE role = 'super_admin';

-- You should see your super admin account
-- Now you can login with:
-- Email: superadmin@emergencyresponse.local (or the email you used)
-- Password: [The password you set in Supabase Auth]

