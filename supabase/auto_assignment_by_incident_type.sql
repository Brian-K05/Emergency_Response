-- Auto-Assignment System Based on Incident Type
-- Based on Thesis Scope: MDRRMO, Emergency Responders, Barangay Officials
-- Automatically assigns appropriate teams based on incident type
-- Manual assignment only required for "other" incident types

-- Step 1: Update team types (based on thesis scope only)
ALTER TABLE response_teams 
DROP CONSTRAINT IF EXISTS response_teams_team_type_check;

ALTER TABLE response_teams
ADD CONSTRAINT response_teams_team_type_check 
CHECK (team_type IN (
    'barangay_team',           -- Barangay Officials/Teams (First Response)
    'municipal_mdrrmo',        -- MDRRMO Staff (Primary Coordinator)
    'municipal_responder',     -- Emergency Responders (general - police, fire, rescue, health workers)
    'other'
));

-- Step 2: Create function to auto-assign teams based on incident type
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
    -- Get incident details
    v_municipality_id := NEW.municipality_id;
    v_barangay_id := NEW.barangay_id;
    v_incident_type := NEW.incident_type;

    -- Skip auto-assignment for "other" incident types (requires manual assignment)
    IF v_incident_type = 'other' THEN
        RETURN NEW;
    END IF;

    -- ============================================
    -- ALL STANDARD INCIDENTS → MDRRMO (Primary Coordinator) + Barangay (First Response)
    -- Based on thesis scope: MDRRMO coordinates, Barangay responds first
    -- ============================================

    -- First: NOTIFY ALL BARANGAY OFFICIALS (Individual Users - Primary Notification)
    -- This ensures notifications even if no team exists or team monitor is missing
    -- CRITICAL: Match by barangay_id - all residents in a barangay alert all officials in that same barangay
    IF v_barangay_id IS NOT NULL THEN
        FOR v_barangay_official IN
            SELECT id, full_name, barangay_id FROM public.users
            WHERE role = 'barangay_official'
            AND barangay_id = v_barangay_id  -- Exact match: incident barangay_id = official barangay_id
            AND is_active = TRUE
        LOOP
            -- Insert notification for this barangay official
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
            -- Track notified users to avoid duplicates
            v_notified_user_ids := array_append(v_notified_user_ids, v_barangay_official.id);
        END LOOP;
    END IF;

    -- Second: Assign to Barangay Team (team-based assignment - if team exists)
    IF v_barangay_id IS NOT NULL THEN
        SELECT * INTO v_team
        FROM response_teams
        WHERE barangay_id = v_barangay_id
        AND team_type = 'barangay_team'
        AND is_active = TRUE
        LIMIT 1;

        IF v_team IS NOT NULL THEN
            -- Create assignment
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

            -- Notify team monitor (only if not already notified as individual barangay official)
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

    -- Second: Assign to MDRRMO (primary coordinator - all incident types)
    SELECT * INTO v_team
    FROM response_teams
    WHERE municipality_id = v_municipality_id
    AND team_type = 'municipal_mdrrmo'
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
            'Auto-assigned: ' || v_incident_type || ' incident - MDRRMO coordination'
        );

        INSERT INTO notifications (
            user_id,
            incident_id,
            notification_type,
            title,
            message
        ) VALUES (
            v_team.monitor_user_id,
            NEW.id,
            'incident_assigned',
            '🚨 New ' || INITCAP(REPLACE(v_incident_type, '_', ' ')) || ' Incident - MDRRMO Coordination Required',
            'A ' || v_incident_type || ' incident has been reported. Please coordinate emergency response immediately.'
        );
        v_assigned_teams := v_assigned_teams + 1;
    END IF;

    -- Update incident status to "assigned" if teams were assigned
    IF v_assigned_teams > 0 THEN
        UPDATE incidents
        SET status = 'assigned'
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_auto_assign_barangay ON incidents;
DROP TRIGGER IF EXISTS trigger_auto_assign_by_type ON incidents;

-- Create new trigger that runs AFTER incident is created
CREATE TRIGGER trigger_auto_assign_by_type
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_teams_by_incident_type();

-- Step 4: Create helper function to check if incident requires manual assignment
CREATE OR REPLACE FUNCTION requires_manual_assignment(p_incident_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_incident_type VARCHAR(50);
BEGIN
    SELECT incident_type INTO v_incident_type
    FROM incidents
    WHERE id = p_incident_id;

    -- "other" incident types require manual assignment
    RETURN (v_incident_type = 'other');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Add comment for documentation
COMMENT ON FUNCTION auto_assign_teams_by_incident_type() IS 
'Auto-assigns appropriate response teams based on incident type (based on thesis scope):
- All standard incidents (fire, medical, accident, natural_disaster, crime) → MDRRMO (primary coordinator) + Barangay Team (first response)
- "other" incident types → No auto-assignment (requires manual assignment by municipal admin)

Notification System:
- Notifies ALL individual barangay_official users in the incident barangay (ensures notifications even if no team exists)
- Also notifies team monitor if barangay team exists (prevents duplicate notifications if monitor is also a barangay official)

Based on thesis: MDRRMO coordinates, Barangay Officials respond first, Emergency Responders available for assignment';

COMMENT ON FUNCTION requires_manual_assignment(BIGINT) IS 
'Returns true if incident type is "other" and requires manual assignment by municipal admin';
