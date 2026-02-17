-- Fix Barangay Official Notifications and Incident Visibility
-- Ensures all barangay officials are notified when residents in their barangay report incidents
-- Also ensures barangay officials can view all incidents from their barangay

-- ============================================
-- STEP 1: Ensure get_user_barangay function returns BIGINT
-- ============================================
DROP POLICY IF EXISTS "Users can view teams in their area" ON response_teams;
DROP POLICY IF EXISTS "Barangay officials can view incidents in their barangay" ON incidents;
DROP FUNCTION IF EXISTS public.get_user_barangay(UUID) CASCADE;

CREATE FUNCTION public.get_user_barangay(user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT barangay_id FROM public.users WHERE id = user_id;
$$;

-- ============================================
-- STEP 2: Fix RLS Policy for Barangay Officials
-- ============================================
CREATE POLICY "Barangay officials can view incidents in their barangay"
    ON incidents FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'barangay_official'
        AND (
            -- View incidents in their barangay (exact match)
            (
                public.get_user_barangay(auth.uid()) IS NOT NULL 
                AND incidents.barangay_id IS NOT NULL
                AND public.get_user_barangay(auth.uid()) = incidents.barangay_id
            )
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

-- Recreate response_teams policy
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

-- ============================================
-- STEP 3: Ensure Auto-Assignment Trigger is Active and Only One Trigger Fires
-- ============================================
-- Drop old conflicting triggers (keep only trigger_auto_assign_by_type)
DROP TRIGGER IF EXISTS trigger_notify_incident_reported ON incidents;
DROP TRIGGER IF EXISTS trigger_auto_assign_barangay ON incidents;

-- Ensure trigger_auto_assign_by_type exists and is active
-- This trigger handles both notifications AND assignments
-- (Created by auto_assignment_by_incident_type.sql - run that file first if trigger doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_auto_assign_by_type' 
        AND tgrelid = 'incidents'::regclass
    ) THEN
        RAISE NOTICE 'WARNING: trigger_auto_assign_by_type does not exist. Please run auto_assignment_by_incident_type.sql first.';
    ELSE
        RAISE NOTICE 'SUCCESS: trigger_auto_assign_by_type is active.';
    END IF;
END $$;

-- ============================================
-- STEP 4: Create Diagnostic Function to Check Barangay Matching
-- ============================================
CREATE OR REPLACE FUNCTION debug_barangay_matching(
    p_incident_barangay_id BIGINT,
    p_incident_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    barangay_official_id UUID,
    barangay_official_name VARCHAR,
    barangay_official_barangay_id BIGINT,
    incident_barangay_id BIGINT,
    match_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.barangay_id,
        p_incident_barangay_id,
        CASE 
            WHEN u.barangay_id = p_incident_barangay_id THEN 'MATCH - Will be notified'
            WHEN u.barangay_id IS NULL THEN 'NO BARANGAY_ID - Will NOT be notified'
            WHEN p_incident_barangay_id IS NULL THEN 'INCIDENT HAS NO BARANGAY_ID - Will NOT be notified'
            ELSE 'NO MATCH - Will NOT be notified'
        END as match_status
    FROM public.users u
    WHERE u.role = 'barangay_official'
    AND u.is_active = TRUE
    ORDER BY 
        CASE WHEN u.barangay_id = p_incident_barangay_id THEN 0 ELSE 1 END,
        u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_barangay_matching(BIGINT, BIGINT) TO authenticated;

-- ============================================
-- STEP 5: Add Comment for Documentation
-- ============================================
COMMENT ON FUNCTION debug_barangay_matching(BIGINT, BIGINT) IS 
'Diagnostic function to check which barangay officials will be notified for an incident.
Usage: SELECT * FROM debug_barangay_matching(barangay_id, incident_id);
This helps verify that barangay_id matching is working correctly.';

