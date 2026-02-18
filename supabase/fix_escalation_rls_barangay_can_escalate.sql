-- Allow barangay officials to create escalation requests (Request Assistance).
-- The previous policy only allowed team monitors; any barangay official in the incident's barangay should be able to escalate.
-- Run this in Supabase SQL Editor. Also ensure fix_escalation_notify_all_municipal.sql has been run so municipal users get notified.

DROP POLICY IF EXISTS "Barangay teams can escalate" ON incident_escalations;

-- Ensure get_user_barangay exists (may already exist from fix_barangay_notifications.sql)
CREATE OR REPLACE FUNCTION public.get_user_barangay(user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT barangay_id FROM public.users WHERE id = user_id;
$$;

-- Barangay officials can insert an escalation for an incident in their barangay
CREATE POLICY "Barangay officials can escalate incidents in their barangay"
ON incident_escalations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = escalated_by
  AND public.get_user_role(auth.uid()) = 'barangay_official'
  AND EXISTS (
    SELECT 1 FROM incidents i
    WHERE i.id = incident_escalations.incident_id
    AND i.barangay_id = public.get_user_barangay(auth.uid())
  )
);
