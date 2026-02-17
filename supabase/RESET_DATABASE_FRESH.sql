-- ============================================
-- RESET DATABASE: Fresh start, only Super Admin
-- ============================================
-- Run this in Supabase SQL Editor when you want:
-- - All incidents/reports cleared
-- - All notifications, assignments, media cleared
-- - All user PROFILES removed (municipal admin, barangay official, residents)
-- You will re-add the Super Admin profile after resetting password (see steps below).
-- ============================================

-- 1. Clear incident-related data (order matters for foreign keys)
DELETE FROM incident_media;
DELETE FROM incident_updates;
DELETE FROM notifications;
DELETE FROM incident_escalations;
DELETE FROM assignments;
DELETE FROM incidents;

-- 2. Clear response_teams (optional – uncomment if you want no teams either)
-- DELETE FROM response_teams;

-- 3. Remove ALL user profiles from public.users
--    (Auth users in Supabase Dashboard remain; only profile rows are removed)
DELETE FROM public.users;

-- ============================================
-- NEXT STEPS (do these in Supabase Dashboard):
-- ============================================
-- 1. Reset Super Admin password:
--    - Go to: Authentication > Users
--    - Find the user with email: emergencyresponse488@gmail.com (or your super admin email)
--    - Click the three dots (•••) > "Send password recovery" OR "Update user"
--    - If "Update user": set a new password and save
--    - If "Send password recovery": check that email and set a new password via the link
--
-- 2. Copy that user's UUID (e.g. 27564027-3655-4f74-a11f-02d44556547e)
--
-- 3. Run the script: READD_SUPER_ADMIN_AFTER_RESET.sql (replace the UUID with yours).
-- ============================================
