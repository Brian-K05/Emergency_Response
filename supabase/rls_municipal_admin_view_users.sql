-- Allow municipal_admin to view (SELECT) users that belong to their municipality only.
-- Allow super_admin to view all users (for Account Management).
-- Required for Account Management page.
-- Run in Supabase SQL Editor.

-- Super admin can view all users (policies.sql may only have 'admin')
DROP POLICY IF EXISTS "Super admin can view all users" ON public.users;
CREATE POLICY "Super admin can view all users"
    ON public.users FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Municipal admin can view only users in their municipality
DROP POLICY IF EXISTS "Municipal admin can view users in their municipality" ON public.users;
CREATE POLICY "Municipal admin can view users in their municipality"
    ON public.users FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'municipal_admin'
        AND public.get_user_municipality(auth.uid()) = public.users.municipality_id
    );

-- Barangay official can view only users in their barangay (for view-only resident list)
DROP POLICY IF EXISTS "Barangay official can view users in their barangay" ON public.users;
CREATE POLICY "Barangay official can view users in their barangay"
    ON public.users FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'barangay_official'
        AND public.get_user_barangay(auth.uid()) = public.users.barangay_id
    );
