-- Fix RLS policies for incidents table
-- This ensures residents can view their own incidents

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own incidents" ON incidents;
DROP POLICY IF EXISTS "Admins can view all incidents" ON incidents;
DROP POLICY IF EXISTS "MDRRMO can view incidents in their municipality" ON incidents;
DROP POLICY IF EXISTS "Responders can view assigned incidents" ON incidents;
DROP POLICY IF EXISTS "Barangay officials can view incidents in their barangay" ON incidents;
DROP POLICY IF EXISTS "Super admins can view all incidents" ON incidents;
DROP POLICY IF EXISTS "Municipal admins can view incidents in their municipality" ON incidents;

-- Recreate policies in correct order
-- 1. Users can view their own reported incidents (for residents)
CREATE POLICY "Users can view own incidents"
    ON incidents FOR SELECT
    USING (reporter_id = auth.uid());

-- 2. Super admins can view all incidents
CREATE POLICY "Super admins can view all incidents"
    ON incidents FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'super_admin');

-- 3. Municipal admins can view incidents in their municipality
CREATE POLICY "Municipal admins can view incidents in their municipality"
    ON incidents FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'municipal_admin'
        AND public.get_user_municipality(auth.uid()) = incidents.municipality_id
    );

-- 4. Legacy admins can view all incidents
CREATE POLICY "Admins can view all incidents"
    ON incidents FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'admin');

-- 5. MDRRMO can view incidents in their municipality
CREATE POLICY "MDRRMO can view incidents in their municipality"
    ON incidents FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'mdrrmo'
        AND public.get_user_municipality(auth.uid()) = incidents.municipality_id
    );

-- 6. Responders can view assigned incidents
CREATE POLICY "Responders can view assigned incidents"
    ON incidents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assignments
            WHERE incident_id = incidents.id
            AND responder_id = auth.uid()
        )
    );

-- Fix get_user_barangay function return type (drop first to change return type)
-- First, drop policies that depend on this function
DROP POLICY IF EXISTS "Users can view teams in their area" ON response_teams;
DROP POLICY IF EXISTS "Barangay officials can view incidents in their barangay" ON incidents;

-- Now drop the function (CASCADE will drop any remaining dependencies)
DROP FUNCTION IF EXISTS public.get_user_barangay(UUID) CASCADE;

-- Recreate the function with correct return type (BIGINT to match incidents.barangay_id)
CREATE FUNCTION public.get_user_barangay(user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT barangay_id FROM public.users WHERE id = user_id;
$$;

-- Recreate the response_teams policy that was dropped
CREATE POLICY "Users can view teams in their area"
    ON response_teams FOR SELECT
    USING (
        -- Super admin can see all
        public.get_user_role(auth.uid()) = 'super_admin'
        OR
        -- Municipal admin can see teams in their municipality
        (
            public.get_user_role(auth.uid()) IN ('municipal_admin', 'admin', 'mdrrmo')
            AND public.get_user_municipality(auth.uid()) = municipality_id
        )
        OR
        -- Barangay officials can see teams in their barangay
        (
            public.get_user_role(auth.uid()) = 'barangay_official'
            AND public.get_user_barangay(auth.uid()) = barangay_id
        )
        OR
        -- Team monitor can see their own team
        monitor_user_id = auth.uid()
    );

-- 7. Barangay officials can view incidents in their barangay
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

