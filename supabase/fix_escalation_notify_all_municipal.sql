-- Ensure ALL municipal users (municipal_admin, mdrrmo, admin) in the municipality
-- get an escalation notification when barangay requests assistance (not just team monitors).
-- They will then get the alert sound in the app.

CREATE OR REPLACE FUNCTION request_municipal_assistance(
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
    SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id;
    IF v_incident IS NULL THEN
        RAISE EXCEPTION 'Incident not found';
    END IF;

    v_municipality_id := v_incident.municipality_id;

    INSERT INTO incident_escalations (
        incident_id, escalated_by, escalated_to_municipality_id, escalation_reason, status
    ) VALUES (
        p_incident_id, p_escalated_by, v_municipality_id, p_reason, 'pending'
    ) RETURNING id INTO v_escalation_id;

    -- 1) Notify team monitors (existing behavior)
    FOR v_municipal_teams IN
        SELECT * FROM response_teams
        WHERE municipality_id = v_municipality_id
        AND team_type IN ('municipal_mdrrmo', 'municipal_responder')
        AND is_active = TRUE
        AND monitor_user_id IS NOT NULL
    LOOP
        IF NOT (v_municipal_teams.monitor_user_id = ANY(v_notified_ids)) THEN
            INSERT INTO notifications (user_id, incident_id, notification_type, title, message)
            VALUES (
                v_municipal_teams.monitor_user_id,
                p_incident_id,
                'escalation_request',
                'Barangay Requests Municipal Assistance',
                'Barangay has requested assistance for incident: ' || COALESCE(v_incident.title, 'Incident #' || p_incident_id) || '. Reason: ' || p_reason
            );
            v_notified_ids := array_append(v_notified_ids, v_municipal_teams.monitor_user_id);
        END IF;
    END LOOP;

    -- 2) Notify ALL municipal users in this municipality (municipal_admin, mdrrmo, admin) so they get the alert sound
    FOR v_municipal_user IN
        SELECT id FROM public.users
        WHERE municipality_id = v_municipality_id
        AND role IN ('municipal_admin', 'mdrrmo', 'admin')
        AND is_active = TRUE
        AND NOT (id = ANY(v_notified_ids))
    LOOP
        INSERT INTO notifications (user_id, incident_id, notification_type, title, message)
        VALUES (
            v_municipal_user.id,
            p_incident_id,
            'escalation_request',
            'Barangay Requests Municipal Assistance',
            'Barangay has requested assistance for incident: ' || COALESCE(v_incident.title, 'Incident #' || p_incident_id) || '. Reason: ' || p_reason
        );
        v_notified_ids := array_append(v_notified_ids, v_municipal_user.id);
    END LOOP;

    UPDATE incidents SET status = 'assigned' WHERE id = p_incident_id;

    RETURN json_build_object(
        'escalation_id', v_escalation_id,
        'message', 'Escalation request sent to municipal teams'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
