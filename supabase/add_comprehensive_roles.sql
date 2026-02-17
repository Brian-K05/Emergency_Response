-- Emergency Response System - Essential Roles Only
-- Focus: WiFi-based reporting for areas without mobile signal
-- MDRRMO coordinates and calls teams directly (no individual responder accounts needed)
-- Run this after schema.sql

-- Step 1: Ensure the users table supports essential roles only (NO responder role)
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN (
    'super_admin',
    'municipal_admin',
    'mdrrmo',
    'barangay_official',
    'admin',
    'resident'
));

-- Step 2: Update get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS VARCHAR
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.users WHERE id = user_id;
$$;

-- Step 3: Create helper function to check if user has administrative privileges
CREATE OR REPLACE FUNCTION public.is_admin_role(user_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT user_role IN (
        'super_admin',
        'municipal_admin',
        'admin'
    );
$$;

-- Step 4: Create helper function to check if user can manage teams
CREATE OR REPLACE FUNCTION public.can_manage_teams(user_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT user_role IN (
        'super_admin',
        'municipal_admin',
        'admin',
        'mdrrmo',
        'barangay_official'
    );
$$;

-- Step 5: Create helper function to check if user can assign incidents
CREATE OR REPLACE FUNCTION public.can_assign_incidents(user_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT user_role IN (
        'super_admin',
        'municipal_admin',
        'admin',
        'mdrrmo',
        'barangay_official'
    );
$$;

-- Step 6: Create helper function to check if user should receive sound alerts
CREATE OR REPLACE FUNCTION public.should_receive_sound_alerts(user_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT user_role IN (
        'super_admin',
        'municipal_admin',
        'admin',
        'mdrrmo',
        'barangay_official'
    );
$$;

-- Step 7: Create helper function to get role display name
CREATE OR REPLACE FUNCTION public.get_role_display_name(user_role VARCHAR)
RETURNS VARCHAR
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE user_role
        WHEN 'super_admin' THEN 'Super Administrator'
        WHEN 'municipal_admin' THEN 'Municipal Administrator'
        WHEN 'mdrrmo' THEN 'MDRRMO Staff'
        WHEN 'barangay_official' THEN 'Barangay Official'
        WHEN 'admin' THEN 'Administrator'
        WHEN 'resident' THEN 'Community Resident'
        ELSE user_role
    END;
$$;

-- Step 8: Create helper function to get role hierarchy level
CREATE OR REPLACE FUNCTION public.get_role_hierarchy_level(user_role VARCHAR)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE user_role
        WHEN 'super_admin' THEN 1
        WHEN 'municipal_admin' THEN 2
        WHEN 'admin' THEN 2
        WHEN 'mdrrmo' THEN 3
        WHEN 'barangay_official' THEN 4
        WHEN 'resident' THEN 5
        ELSE 6
    END;
$$;

-- Step 9: Add comment to users.role column
COMMENT ON COLUMN public.users.role IS 'User role in the emergency response system. See ROLES_AND_RESPONSIBILITIES.md for detailed role descriptions.';

-- Step 10: Create view for role statistics
CREATE OR REPLACE VIEW public.role_statistics AS
SELECT 
    role,
    public.get_role_display_name(role) as role_display_name,
    public.get_role_hierarchy_level(role) as hierarchy_level,
    COUNT(*) as user_count,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
    COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_users
FROM public.users
GROUP BY role
ORDER BY hierarchy_level, role;

-- Grant access to role statistics view
GRANT SELECT ON public.role_statistics TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Emergency response roles system configured successfully!';
    RAISE NOTICE 'Available roles (6 roles - NO individual responder accounts):';
    RAISE NOTICE '  1. super_admin - System-wide administration';
    RAISE NOTICE '  2. municipal_admin - Municipal administration';
    RAISE NOTICE '  3. mdrrmo - Emergency coordinator (calls teams directly)';
    RAISE NOTICE '  4. barangay_official - Barangay emergency management';
    RAISE NOTICE '  5. admin - Legacy administrator';
    RAISE NOTICE '  6. resident - Community member (reports via WiFi)';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Design: MDRRMO coordinates and calls professional teams (fire, police, medical)';
    RAISE NOTICE 'directly via phone/radio, then updates system. No individual responder accounts needed.';
    RAISE NOTICE '';
    RAISE NOTICE 'See ROLES_AND_RESPONSIBILITIES.md and PROBLEM_STATEMENT.md for details.';
END $$;
