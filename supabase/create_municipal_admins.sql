-- Create Municipal Admin Profiles
-- Run this AFTER creating auth users in Supabase Auth
-- This script creates user profiles for the 5 municipal admins

-- Create all 5 municipal admins
INSERT INTO public.users (
    id, username, email, full_name, role, municipality_id, phone_number, address, is_active, created_at, updated_at
)
SELECT 
    au.id,
    'san_isidro_admin',
    'admin.sanisidro@emergency.local',
    'San Isidro Municipal Administrator',
    'municipal_admin',
    (SELECT id FROM municipalities WHERE name = 'San Isidro'),
    '09123456789',
    'San Isidro Municipal Hall',
    TRUE,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'admin.sanisidro@emergency.local'
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    municipality_id = EXCLUDED.municipality_id,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;

INSERT INTO public.users (
    id, username, email, full_name, role, municipality_id, phone_number, address, is_active, created_at, updated_at
)
SELECT 
    au.id,
    'victoria_admin',
    'admin.victoria@emergency.local',
    'Victoria Municipal Administrator',
    'municipal_admin',
    (SELECT id FROM municipalities WHERE name = 'Victoria'),
    '09123456790',
    'Victoria Municipal Hall',
    TRUE,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'admin.victoria@emergency.local'
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    municipality_id = EXCLUDED.municipality_id,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;

INSERT INTO public.users (
    id, username, email, full_name, role, municipality_id, phone_number, address, is_active, created_at, updated_at
)
SELECT 
    au.id,
    'allen_admin',
    'admin.allen@emergency.local',
    'Allen Municipal Administrator',
    'municipal_admin',
    (SELECT id FROM municipalities WHERE name = 'Allen'),
    '09123456791',
    'Allen Municipal Hall',
    TRUE,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'admin.allen@emergency.local'
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    municipality_id = EXCLUDED.municipality_id,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;

INSERT INTO public.users (
    id, username, email, full_name, role, municipality_id, phone_number, address, is_active, created_at, updated_at
)
SELECT 
    au.id,
    'lavezares_admin',
    'admin.lavezares@emergency.local',
    'Lavezares Municipal Administrator',
    'municipal_admin',
    (SELECT id FROM municipalities WHERE name = 'Lavezares'),
    '09123456792',
    'Lavezares Municipal Hall',
    TRUE,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'admin.lavezares@emergency.local'
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    municipality_id = EXCLUDED.municipality_id,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;

INSERT INTO public.users (
    id, username, email, full_name, role, municipality_id, phone_number, address, is_active, created_at, updated_at
)
SELECT 
    au.id,
    'rosario_admin',
    'admin.rosario@emergency.local',
    'Rosario Municipal Administrator',
    'municipal_admin',
    (SELECT id FROM municipalities WHERE name = 'Rosario'),
    '09123456793',
    'Rosario Municipal Hall',
    TRUE,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'admin.rosario@emergency.local'
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    municipality_id = EXCLUDED.municipality_id,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;

-- Verify admins were created
SELECT username, email, full_name, role, municipality_id 
FROM users 
WHERE role = 'municipal_admin' 
ORDER BY municipality_id;

