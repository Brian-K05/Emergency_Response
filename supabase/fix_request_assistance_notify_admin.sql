-- Request Assistance: correct RPC params (p_escalated_by, p_reason) and notify ALL municipal users including admin.
-- Run this in Supabase SQL Editor so "Request Assistance" works and admin gets alerted.
-- Safe to run even if incident_escalations or response_teams don't exist (those parts are skipped then).

CREATE OR REPLACE FUNCTION public.request_municipal_assistance(
    p_incident_id BIGINT,
    p_escalated_by UUID,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_incident RECORD;
    v_municipality_id BIGINT;
    v_escalation_id BIGINT;
    v_municipal_teams RECORD;
    v_municipal_user RECORD;
    v_notified_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id;
    IF v_incident IS NULL THEN
        RAISE EXCEPTION 'Incident not found';
    END IF;

    v_municipality_id := v_incident.municipality_id;
    IF v_municipality_id IS NULL THEN
        RAISE EXCEPTION 'Incident has no municipality';
    END IF;

    -- Optional: log to incident_escalations if table exists
    BEGIN
        INSERT INTO public.incident_escalations (
            incident_id, escalated_by, escalated_to_municipality_id, escalation_reason, status
        ) VALUES (
            p_incident_id, p_escalated_by, v_municipality_id, COALESCE(p_reason, ''), 'pending'
        ) RETURNING id INTO v_escalation_id;
    EXCEPTION WHEN undefined_table THEN
        v_escalation_id := NULL;
    END;

    -- Optional: notify team monitors (if response_teams exists)
    BEGIN
        FOR v_municipal_teams IN
            SELECT * FROM public.response_teams
            WHERE municipality_id = v_municipality_id
            AND team_type IN ('municipal_mdrrmo', 'municipal_responder')
            AND is_active = TRUE
            AND monitor_user_id IS NOT NULL
        LOOP
            IF NOT (v_municipal_teams.monitor_user_id = ANY(v_notified_ids)) THEN
                INSERT INTO public.notifications (user_id, incident_id, notification_type, title, message)
                VALUES (
                    v_municipal_teams.monitor_user_id,
                    p_incident_id,
                    'escalation_request',
                    'Barangay Requests Municipal Assistance',
                    'Barangay has requested assistance for incident: ' || COALESCE(v_incident.title, 'Incident #' || p_incident_id) || '. Reason: ' || COALESCE(p_reason, '')
                );
                v_notified_ids := array_append(v_notified_ids, v_municipal_teams.monitor_user_id);
            END IF;
        END LOOP;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    -- Notify ALL municipal users (municipal_admin, mdrrmo, admin) so admin is alerted
    FOR v_municipal_user IN
        SELECT id FROM public.users
        WHERE municipality_id = v_municipality_id
        AND role IN ('municipal_admin', 'mdrrmo', 'admin')
        AND (is_active IS NULL OR is_active = TRUE)
        AND NOT (id = ANY(v_notified_ids))
    LOOP
        INSERT INTO public.notifications (user_id, incident_id, notification_type, title, message)
        VALUES (
            v_municipal_user.id,
            p_incident_id,
            'escalation_request',
            'Barangay Requests Municipal Assistance',
            'Barangay has requested assistance for incident: ' || COALESCE(v_incident.title, 'Incident #' || p_incident_id) || '. Reason: ' || COALESCE(p_reason, '')
        );
        v_notified_ids := array_append(v_notified_ids, v_municipal_user.id);
    END LOOP;

    -- Audit log
    INSERT INTO public.incident_updates (incident_id, updated_by, update_message, new_status)
    VALUES (
        p_incident_id,
        p_escalated_by,
        'Municipal assistance requested: ' || COALESCE(p_reason, ''),
        'assigned'
    );

    UPDATE public.incidents SET status = 'assigned' WHERE id = p_incident_id;

    RETURN json_build_object(
        'escalation_id', v_escalation_id,
        'message', 'Escalation request sent to municipal teams'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.request_municipal_assistance(BIGINT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_municipal_assistance(BIGINT, UUID, TEXT) TO service_role;
