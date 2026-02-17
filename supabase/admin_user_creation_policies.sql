-- ============================================
-- ADMIN USER CREATION POLICIES
-- ============================================
-- Run this AFTER running update_schema_for_admins.sql
-- This allows super_admin and municipal_admin to create user accounts
-- ============================================

-- Drop existing admin insert policies if they exist
DROP POLICY IF EXISTS "Super admins can create users" ON public.users;
DROP POLICY IF EXISTS "Municipal admins can create users in their municipality" ON public.users;
DROP POLICY IF EXISTS "Admins can create users" ON public.users;

-- Create a function for admins to create user profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_create_user_profile(
    new_user_id UUID,
    user_username VARCHAR,
    user_email VARCHAR,
    user_full_name VARCHAR,
    user_role VARCHAR,
    user_municipality_id BIGINT DEFAULT NULL,
    user_barangay_id BIGINT DEFAULT NULL,
    user_phone_number VARCHAR DEFAULT NULL,
    user_age INTEGER DEFAULT NULL,
    user_gender VARCHAR DEFAULT NULL,
    user_civil_status VARCHAR DEFAULT NULL,
    user_educational_attainment VARCHAR DEFAULT NULL,
    user_trainings_seminars_attended TEXT DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role TEXT;
    current_user_municipality_id BIGINT;
    new_user public.users;
BEGIN
    -- Get current user's role and municipality
    SELECT role, municipality_id INTO current_user_role, current_user_municipality_id
    FROM public.users
    WHERE id = auth.uid();
    
    -- Check if current user is authorized to create users
    IF current_user_role NOT IN ('super_admin', 'municipal_admin', 'admin') THEN
        RAISE EXCEPTION 'Only administrators can create user accounts';
    END IF;
    
    -- If municipal admin, ensure they can only create users in their municipality
    IF current_user_role = 'municipal_admin' THEN
        IF user_municipality_id IS NULL OR user_municipality_id != current_user_municipality_id THEN
            RAISE EXCEPTION 'Municipal admins can only create users in their own municipality';
        END IF;
        
        -- Municipal admin cannot create admin roles
        IF user_role IN ('super_admin', 'municipal_admin', 'admin') THEN
            RAISE EXCEPTION 'Municipal admins cannot create admin accounts';
        END IF;
    END IF;
    
    -- Legacy admin role cannot create super_admin or municipal_admin
    IF current_user_role = 'admin' THEN
        IF user_role IN ('super_admin', 'municipal_admin') THEN
            RAISE EXCEPTION 'Legacy admins cannot create super admin or municipal admin accounts';
        END IF;
    END IF;
    
    -- Super admin can create any role
    
    -- Insert the new user profile
    INSERT INTO public.users (
        id,
        username,
        email,
        full_name,
        role,
        municipality_id,
        barangay_id,
        phone_number,
        age,
        gender,
        civil_status,
        educational_attainment,
        trainings_seminars_attended,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        new_user_id,
        user_username,
        user_email,
        user_full_name,
        user_role,
        user_municipality_id,
        user_barangay_id,
        user_phone_number,
        user_age,
        user_gender,
        user_civil_status,
        user_educational_attainment,
        user_trainings_seminars_attended,
        TRUE,
        NOW(),
        NOW()
    )
    RETURNING * INTO new_user;
    
    RETURN new_user;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_create_user_profile(
    UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, INTEGER, VARCHAR, VARCHAR, VARCHAR, TEXT
) TO authenticated;

-- Policy: Super admins can create users
CREATE POLICY "Super admins can create users"
    ON public.users FOR INSERT
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'super_admin'
    );

-- Policy: Municipal admins can create users in their municipality
CREATE POLICY "Municipal admins can create users in their municipality"
    ON public.users FOR INSERT
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'municipal_admin'
        AND public.get_user_municipality(auth.uid()) = municipality_id
        AND role NOT IN ('super_admin', 'municipal_admin', 'admin')
    );

-- Policy: Legacy admins can create users (but not super_admin or municipal_admin)
CREATE POLICY "Admins can create users"
    ON public.users FOR INSERT
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'admin'
        AND role NOT IN ('super_admin', 'municipal_admin')
    );

-- Update view policies to include super_admin and municipal_admin
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Municipal admins can view users in their municipality" ON public.users;

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
    ON public.users FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Municipal admins can view users in their municipality
CREATE POLICY "Municipal admins can view users in their municipality"
    ON public.users FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'municipal_admin'
        AND public.get_user_municipality(auth.uid()) = public.users.municipality_id
    );

-- Legacy admins can view all users
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'admin');

-- Update incident policies to include super_admin and municipal_admin
DROP POLICY IF EXISTS "Admins can view all incidents" ON incidents;
DROP POLICY IF EXISTS "Super admins can view all incidents" ON incidents;
DROP POLICY IF EXISTS "Municipal admins can view incidents in their municipality" ON incidents;

-- Super admins can view all incidents
CREATE POLICY "Super admins can view all incidents"
    ON incidents FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Municipal admins can view incidents in their municipality
CREATE POLICY "Municipal admins can view incidents in their municipality"
    ON incidents FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'municipal_admin'
        AND public.get_user_municipality(auth.uid()) = incidents.municipality_id
    );

-- Legacy admins can view all incidents
CREATE POLICY "Admins can view all incidents"
    ON incidents FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'admin');

-- Update assignment policies
DROP POLICY IF EXISTS "Admins and MDRRMO can view assignments" ON assignments;
DROP POLICY IF EXISTS "Admins and MDRRMO can create assignments" ON assignments;

CREATE POLICY "Admins and MDRRMO can view assignments"
    ON assignments FOR SELECT
    USING (
        public.get_user_role(auth.uid()) IN ('super_admin', 'municipal_admin', 'admin', 'mdrrmo')
    );

CREATE POLICY "Admins and MDRRMO can create assignments"
    ON assignments FOR INSERT
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('super_admin', 'municipal_admin', 'admin', 'mdrrmo')
    );

-- Update incident update policies
DROP POLICY IF EXISTS "Admins and MDRRMO can update incidents" ON incidents;

CREATE POLICY "Admins and MDRRMO can update incidents"
    ON incidents FOR UPDATE
    USING (
        public.get_user_role(auth.uid()) IN ('super_admin', 'municipal_admin', 'admin', 'mdrrmo')
    );

