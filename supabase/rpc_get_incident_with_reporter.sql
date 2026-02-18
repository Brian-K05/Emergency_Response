-- Returns incident with reporter info so Reporter Information is visible to viewers.
-- Bypasses RLS on users for the reporter row so any user who can view the incident can see reporter.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_incident_with_reporter(p_incident_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_reporter RECORD;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_municipality_id BIGINT;
  v_user_barangay_id BIGINT;
  v_can_view BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, municipality_id, barangay_id
    INTO v_user_role, v_user_municipality_id, v_user_barangay_id
    FROM public.users
    WHERE id = v_user_id;

  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id;
  IF v_incident IS NULL THEN
    RETURN NULL;
  END IF;

  -- Who can view: reporter (own), admin/municipal_admin (all), mdrrmo (same municipality), barangay_official (same barangay)
  IF v_incident.reporter_id = v_user_id THEN
    v_can_view := TRUE;
  ELSIF v_user_role IN ('super_admin', 'admin') THEN
    v_can_view := TRUE;
  ELSIF v_user_role = 'municipal_admin' AND v_incident.municipality_id IS NOT NULL AND v_incident.municipality_id = v_user_municipality_id THEN
    v_can_view := TRUE;
  ELSIF v_user_role = 'mdrrmo' AND v_incident.municipality_id IS NOT NULL AND v_incident.municipality_id = v_user_municipality_id THEN
    v_can_view := TRUE;
  ELSIF v_user_role = 'barangay_official' AND v_incident.barangay_id IS NOT NULL AND v_user_barangay_id IS NOT NULL AND v_incident.barangay_id = v_user_barangay_id THEN
    v_can_view := TRUE;
  END IF;

  IF NOT v_can_view THEN
    RETURN NULL;
  END IF;

  IF v_incident.reporter_id IS NOT NULL THEN
    SELECT id, full_name, email, phone_number
      INTO v_reporter
      FROM public.users
      WHERE id = v_incident.reporter_id;
  END IF;

  RETURN json_build_object(
    'id', v_incident.id,
    'title', v_incident.title,
    'description', v_incident.description,
    'incident_type', v_incident.incident_type,
    'status', v_incident.status,
    'urgency_level', v_incident.urgency_level,
    'location_address', v_incident.location_address,
    'latitude', v_incident.latitude,
    'longitude', v_incident.longitude,
    'contact_number', v_incident.contact_number,
    'barangay_id', v_incident.barangay_id,
    'municipality_id', v_incident.municipality_id,
    'reporter_id', v_incident.reporter_id,
    'created_at', v_incident.created_at,
    'resolved_at', v_incident.resolved_at,
    'reporter', CASE WHEN v_reporter.id IS NOT NULL THEN json_build_object(
      'id', v_reporter.id,
      'full_name', v_reporter.full_name,
      'email', v_reporter.email,
      'phone_number', v_reporter.phone_number
    ) ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_incident_with_reporter(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incident_with_reporter(BIGINT) TO service_role;
