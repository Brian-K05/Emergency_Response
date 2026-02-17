-- Row Level Security (RLS) Policies for Emergency Response Platform
-- Run this after schema.sql and seed.sql
-- This script will DROP all existing policies and functions, then create new ones

-- ============================================
-- STEP 1: Drop all existing policies FIRST
-- (Must drop policies before functions they depend on)
-- ============================================

-- Drop policies on municipalities
DROP POLICY IF EXISTS "Municipalities are viewable by everyone" ON municipalities;

-- Drop policies on barangays
DROP POLICY IF EXISTS "Barangays are viewable by everyone" ON barangays;

-- Drop policies on users
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "MDRRMO can view users in their municipality" ON public.users;

-- Drop policies on incidents
DROP POLICY IF EXISTS "Authenticated users can create incidents" ON incidents;
DROP POLICY IF EXISTS "Users can view own incidents" ON incidents;
DROP POLICY IF EXISTS "Admins can view all incidents" ON incidents;
DROP POLICY IF EXISTS "MDRRMO can view incidents in their municipality" ON incidents;
DROP POLICY IF EXISTS "Responders can view assigned incidents" ON incidents;
DROP POLICY IF EXISTS "Barangay officials can view incidents in their barangay" ON incidents;
DROP POLICY IF EXISTS "Users can update own incidents" ON incidents;
DROP POLICY IF EXISTS "Admins and MDRRMO can update incidents" ON incidents;
DROP POLICY IF EXISTS "Responders can update assigned incidents" ON incidents;

-- Drop policies on incident_media
DROP POLICY IF EXISTS "Users can view incident media" ON incident_media;
DROP POLICY IF EXISTS "Users can upload media for own incidents" ON incident_media;

-- Drop policies on assignments
DROP POLICY IF EXISTS "Admins and MDRRMO can view assignments" ON assignments;
DROP POLICY IF EXISTS "Responders can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Admins and MDRRMO can create assignments" ON assignments;

-- Drop policies on incident_updates
DROP POLICY IF EXISTS "Users can view incident updates" ON incident_updates;
DROP POLICY IF EXISTS "Users can create incident updates" ON incident_updates;

-- Drop policies on notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- ============================================
-- STEP 2: Drop all existing functions
-- (Now safe to drop since policies are gone)
-- ============================================
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_municipality(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_barangay(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- ============================================
-- STEP 3: Enable RLS on all tables
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE barangays ENABLE ROW LEVEL SECURITY;

-- Municipalities: Public read access
CREATE POLICY "Municipalities are viewable by everyone"
    ON municipalities FOR SELECT
    USING (true);

-- Barangays: Public read access
CREATE POLICY "Barangays are viewable by everyone"
    ON barangays FOR SELECT
    USING (true);

-- Create a function to insert user profile (bypasses RLS for initial creation)
CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_id UUID,
    user_username VARCHAR,
    user_email VARCHAR,
    user_full_name VARCHAR,
    user_role VARCHAR DEFAULT 'resident'
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_user public.users;
BEGIN
    -- Verify that the user_id matches the authenticated user
    IF user_id != auth.uid() THEN
        RAISE EXCEPTION 'User ID does not match authenticated user';
    END IF;
    
    INSERT INTO public.users (id, username, email, full_name, role)
    VALUES (user_id, user_username, user_email, user_full_name, user_role)
    RETURNING * INTO new_user;
    
    RETURN new_user;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- Users Policies
-- Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Create a function to check user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.users WHERE id = user_id;
$$;

-- Create a function to get user municipality without recursion
CREATE OR REPLACE FUNCTION public.get_user_municipality(user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT municipality_id FROM public.users WHERE id = user_id;
$$;

-- Admins can view all users (using security definer function to avoid recursion)
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'admin');

-- MDRRMO can view users in their municipality
CREATE POLICY "MDRRMO can view users in their municipality"
    ON public.users FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'mdrrmo'
        AND public.get_user_municipality(auth.uid()) = public.users.municipality_id
    );

-- Incidents Policies
-- Anyone authenticated can create incidents
CREATE POLICY "Authenticated users can create incidents"
    ON incidents FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can view their own reported incidents
CREATE POLICY "Users can view own incidents"
    ON incidents FOR SELECT
    USING (reporter_id = auth.uid());

-- Admins can view all incidents
CREATE POLICY "Admins can view all incidents"
    ON incidents FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'admin');

-- MDRRMO can view incidents in their municipality
CREATE POLICY "MDRRMO can view incidents in their municipality"
    ON incidents FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'mdrrmo'
        AND public.get_user_municipality(auth.uid()) = incidents.municipality_id
    );

-- Responders can view assigned incidents
CREATE POLICY "Responders can view assigned incidents"
    ON incidents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assignments
            WHERE incident_id = incidents.id
            AND responder_id = auth.uid()
        )
    );

-- Create function to get user barangay (return BIGINT to match incidents.barangay_id)
-- Drop first if exists to allow changing return type
DROP FUNCTION IF EXISTS public.get_user_barangay(UUID);

CREATE FUNCTION public.get_user_barangay(user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT barangay_id FROM public.users WHERE id = user_id;
$$;

-- Barangay officials can view incidents in their barangay
-- Also allow viewing incidents assigned to their team
CREATE POLICY "Barangay officials can view incidents in their barangay"
    ON incidents FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'barangay_official'
        AND (
            -- View incidents in their barangay
            (public.get_user_barangay(auth.uid()) IS NOT NULL 
             AND incidents.barangay_id IS NOT NULL
             AND public.get_user_barangay(auth.uid()) = incidents.barangay_id)
            OR
            -- View incidents assigned to their team
            EXISTS (
                SELECT 1 FROM assignments a
                INNER JOIN response_teams rt ON a.team_id = rt.id
                WHERE a.incident_id = incidents.id
                AND rt.team_type = 'barangay_team'
                AND rt.barangay_id = public.get_user_barangay(auth.uid())
                AND rt.is_active = TRUE
            )
        )
    );

-- Users can update their own incidents (status only)
CREATE POLICY "Users can update own incidents"
    ON incidents FOR UPDATE
    USING (reporter_id = auth.uid());

-- Admins and MDRRMO can update any incident
CREATE POLICY "Admins and MDRRMO can update incidents"
    ON incidents FOR UPDATE
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'mdrrmo')
    );

-- Responders can update assigned incidents
CREATE POLICY "Responders can update assigned incidents"
    ON incidents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM assignments
            WHERE incident_id = incidents.id
            AND responder_id = auth.uid()
        )
    );

-- Incident Media Policies
-- Users can view media for incidents they can see
CREATE POLICY "Users can view incident media"
    ON incident_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE id = incident_media.incident_id
        )
    );

-- Users can upload media for their incidents
CREATE POLICY "Users can upload media for own incidents"
    ON incident_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE id = incident_media.incident_id
            AND reporter_id = auth.uid()
        )
    );

-- Assignments Policies
-- Admins and MDRRMO can view all assignments
CREATE POLICY "Admins and MDRRMO can view assignments"
    ON assignments FOR SELECT
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'mdrrmo')
    );

-- Responders can view their own assignments
CREATE POLICY "Responders can view own assignments"
    ON assignments FOR SELECT
    USING (responder_id = auth.uid());

-- Admins and MDRRMO can create assignments
CREATE POLICY "Admins and MDRRMO can create assignments"
    ON assignments FOR INSERT
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'mdrrmo')
    );

-- Incident Updates Policies
-- Anyone can view updates for incidents they can see
CREATE POLICY "Users can view incident updates"
    ON incident_updates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE id = incident_updates.incident_id
        )
    );

-- Users can create updates for incidents they can update
CREATE POLICY "Users can create incident updates"
    ON incident_updates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE id = incident_updates.incident_id
        )
    );

-- Notifications Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- System can create notifications (via service role)
-- This is handled by Supabase functions or backend service

