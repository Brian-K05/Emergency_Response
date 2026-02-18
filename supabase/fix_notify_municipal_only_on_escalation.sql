-- Notify municipal (MDRRMO / municipal admin) ONLY when barangay escalates
-- On new incident: notify ONLY barangay officials in that barangay.
-- Municipal is notified only via request_municipal_assistance() when barangay clicks "Request Municipal Assistance".

CREATE OR REPLACE FUNCTION auto_assign_teams_by_incident_type()
RETURNS TRIGGER AS $$
DECLARE
    v_team RECORD;
    v_municipality_id BIGINT;
    v_barangay_id BIGINT;
    v_incident_type VARCHAR(50);
    v_assigned_teams INTEGER := 0;
    v_barangay_official RECORD;
    v_notified_user_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    v_municipality_id := NEW.municipality_id;
    v_barangay_id := NEW.barangay_id;
    v_incident_type := NEW.incident_type;

    IF v_incident_type = 'other' THEN
        RETURN NEW;
    END IF;

    -- ============================================
    -- NOTIFY ONLY BARANGAY OFFICIALS (no municipal on new incident)
    -- Municipal/MDRRMO are notified only when barangay escalates (request_municipal_assistance)
    -- ============================================

    IF v_barangay_id IS NOT NULL THEN
        FOR v_barangay_official IN
            SELECT id, full_name, barangay_id FROM public.users
            WHERE role = 'barangay_official'
            AND barangay_id = v_barangay_id
            AND is_active = TRUE
        LOOP
            INSERT INTO notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message,
                is_read
            ) VALUES (
                v_barangay_official.id,
                NEW.id,
                'new_incident',
                '🚨 New Incident in Your Barangay',
                'A ' || v_incident_type || ' incident has been reported in your barangay. Urgency: ' || NEW.urgency_level || ' - Your immediate response is needed.',
                FALSE
            );
            v_notified_user_ids := array_append(v_notified_user_ids, v_barangay_official.id);
        END LOOP;
    END IF;

    -- Assign to Barangay Team only (no MDRRMO assignment on new incident)
    IF v_barangay_id IS NOT NULL THEN
        SELECT * INTO v_team
        FROM response_teams
        WHERE barangay_id = v_barangay_id
        AND team_type = 'barangay_team'
        AND is_active = TRUE
        LIMIT 1;

        IF v_team IS NOT NULL THEN
            INSERT INTO assignments (
                incident_id,
                team_id,
                assigned_by,
                status,
                notes
            ) VALUES (
                NEW.id,
                v_team.id,
                NEW.reporter_id,
                'assigned',
                'Auto-assigned: ' || v_incident_type || ' incident - Barangay first response'
            );

            IF v_team.monitor_user_id IS NOT NULL AND NOT (v_team.monitor_user_id = ANY(v_notified_user_ids)) THEN
                INSERT INTO notifications (
                    user_id,
                    incident_id,
                    notification_type,
                    title,
                    message
                ) VALUES (
                    v_team.monitor_user_id,
                    NEW.id,
                    'team_assigned',
                    '🚨 New Incident in Your Barangay - First Response Required',
                    'A ' || v_incident_type || ' incident has been reported in your barangay. Please alert your team and respond immediately.'
                );
            END IF;
            v_assigned_teams := v_assigned_teams + 1;
        END IF;
    END IF;

    -- MDRRMO / municipal: NOT assigned and NOT notified here.
    -- They are notified only when barangay calls request_municipal_assistance (escalation).

    IF v_assigned_teams > 0 THEN
        UPDATE incidents
        SET status = 'assigned'
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_assign_teams_by_incident_type() IS 
'On new incident: notifies and assigns only barangay officials in that barangay. Municipal/MDRRMO are notified only when barangay escalates via request_municipal_assistance().';
