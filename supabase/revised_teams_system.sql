-- Revised Teams System - Single Account Per Team
-- Each team has ONE account that monitors and alerts the physical team
-- Barangay teams handle first, municipal teams only when requested

-- Drop old tables if they exist
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS response_teams CASCADE;

-- Response Teams Table (ONE account per team)
CREATE TABLE response_teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    team_type VARCHAR(50) NOT NULL CHECK (team_type IN ('barangay_team', 'municipal_mdrrmo', 'municipal_responder', 'other')),
    municipality_id BIGINT REFERENCES municipalities(id) ON DELETE CASCADE,
    barangay_id BIGINT REFERENCES barangays(id) ON DELETE CASCADE,
    -- ONE user account that monitors this team
    monitor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    description TEXT,
    contact_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint: Barangay teams must have barangay_id, Municipal teams must have municipality_id
    CONSTRAINT teams_location_check CHECK (
        (team_type = 'barangay_team' AND barangay_id IS NOT NULL) OR
        (team_type != 'barangay_team' AND municipality_id IS NOT NULL)
    )
);

-- Update Assignments Table - assign to team (one account)
ALTER TABLE assignments 
DROP COLUMN IF EXISTS team_id;

ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES response_teams(id) ON DELETE SET NULL;

-- Update constraint: either responder_id OR team_id must be set
ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_responder_or_team_check;

ALTER TABLE assignments 
ADD CONSTRAINT assignments_responder_or_team_check 
CHECK (
    (responder_id IS NOT NULL AND team_id IS NULL) OR 
    (responder_id IS NULL AND team_id IS NOT NULL)
);

-- Incident Escalation Table - Track when barangay requests municipal help
CREATE TABLE IF NOT EXISTS incident_escalations (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    escalated_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Barangay team account
    escalated_to_municipality_id BIGINT REFERENCES municipalities(id) ON DELETE CASCADE,
    escalation_reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'resolved', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_response_teams_municipality ON response_teams(municipality_id);
CREATE INDEX IF NOT EXISTS idx_response_teams_barangay ON response_teams(barangay_id);
CREATE INDEX IF NOT EXISTS idx_response_teams_type ON response_teams(team_type);
CREATE INDEX IF NOT EXISTS idx_response_teams_monitor ON response_teams(monitor_user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_team ON assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_escalations_incident ON incident_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_escalations_municipality ON incident_escalations(escalated_to_municipality_id);

-- RLS Policies for Teams
ALTER TABLE response_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_escalations ENABLE ROW LEVEL SECURITY;

-- Teams: Users can view teams in their area
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

-- Teams: Municipal admins can create/manage teams
CREATE POLICY "Municipal admins can manage teams"
    ON response_teams FOR ALL
    USING (
        public.get_user_role(auth.uid()) IN ('super_admin', 'municipal_admin', 'admin')
        AND (
            municipality_id IS NULL 
            OR public.get_user_municipality(auth.uid()) = municipality_id
        )
    );

-- Escalations: Users can view escalations for incidents they can see
CREATE POLICY "Users can view escalations"
    ON incident_escalations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE id = incident_escalations.incident_id
        )
    );

-- Escalations: Barangay teams can create escalations
CREATE POLICY "Barangay teams can escalate"
    ON incident_escalations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM response_teams
            WHERE monitor_user_id = auth.uid()
            AND team_type = 'barangay_team'
        )
    );

-- Function: Auto-assign incident to barangay team
CREATE OR REPLACE FUNCTION auto_assign_to_barangay_team()
RETURNS TRIGGER AS $$
DECLARE
    barangay_team RECORD;
BEGIN
    -- Only for new incidents with barangay_id
    IF NEW.barangay_id IS NOT NULL THEN
        -- Find active barangay team for this barangay
        SELECT * INTO barangay_team
        FROM response_teams
        WHERE barangay_id = NEW.barangay_id
        AND team_type = 'barangay_team'
        AND is_active = TRUE
        LIMIT 1;

        -- If team exists, assign incident to them
        IF barangay_team IS NOT NULL THEN
            INSERT INTO assignments (
                incident_id,
                team_id,
                assigned_by,
                status,
                notes
            ) VALUES (
                NEW.id,
                barangay_team.id,
                NEW.reporter_id, -- System assignment
                'assigned',
                'Auto-assigned to barangay team'
            );

            -- Notify the team monitor
            INSERT INTO notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message
            ) VALUES (
                barangay_team.monitor_user_id,
                NEW.id,
                'incident_assigned',
                'New Incident in Your Area',
                'A new ' || NEW.incident_type || ' incident has been reported in your barangay. Please alert your team and respond.'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-assign to barangay team when incident is created
DROP TRIGGER IF EXISTS trigger_auto_assign_barangay ON incidents;
CREATE TRIGGER trigger_auto_assign_barangay
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_to_barangay_team();

-- Function: Notify team monitor when team is assigned
CREATE OR REPLACE FUNCTION notify_team_monitor()
RETURNS TRIGGER AS $$
DECLARE
    team_monitor UUID;
BEGIN
    -- Only process if team_id is set
    IF NEW.team_id IS NOT NULL THEN
        -- Get the team monitor user
        SELECT monitor_user_id INTO team_monitor
        FROM response_teams
        WHERE id = NEW.team_id;

        IF team_monitor IS NOT NULL THEN
            INSERT INTO notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message
            ) VALUES (
                team_monitor,
                NEW.incident_id,
                'team_assigned',
                'Team Assigned to Incident',
                'Your team has been assigned to an incident. Please alert your physical team members and coordinate response.'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify team monitor on assignment
DROP TRIGGER IF EXISTS trigger_notify_team_monitor ON assignments;
CREATE TRIGGER trigger_notify_team_monitor
    AFTER INSERT ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_team_monitor();

-- Function: Handle escalation request
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
BEGIN
    -- Get incident details
    SELECT * INTO v_incident
    FROM incidents
    WHERE id = p_incident_id;

    IF v_incident IS NULL THEN
        RAISE EXCEPTION 'Incident not found';
    END IF;

    v_municipality_id := v_incident.municipality_id;

    -- Create escalation record
    INSERT INTO incident_escalations (
        incident_id,
        escalated_by,
        escalated_to_municipality_id,
        escalation_reason,
        status
    ) VALUES (
        p_incident_id,
        p_escalated_by,
        v_municipality_id,
        p_reason,
        'pending'
    ) RETURNING id INTO v_escalation_id;

    -- Notify all municipal teams in the municipality (MDRRMO and Emergency Responders)
    FOR v_municipal_teams IN
        SELECT * FROM response_teams
        WHERE municipality_id = v_municipality_id
        AND team_type IN ('municipal_mdrrmo', 'municipal_responder')
        AND is_active = TRUE
    LOOP
        INSERT INTO notifications (
            user_id,
            incident_id,
            notification_type,
            title,
            message
        ) VALUES (
            v_municipal_teams.monitor_user_id,
            p_incident_id,
            'escalation_request',
            'Barangay Requests Municipal Assistance',
            'Barangay team has requested assistance for incident: ' || v_incident.title || '. Reason: ' || p_reason
        );
    END LOOP;

    -- Update incident status
    UPDATE incidents
    SET status = 'assigned'
    WHERE id = p_incident_id;

    RETURN json_build_object(
        'escalation_id', v_escalation_id,
        'message', 'Escalation request sent to municipal teams'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger for updated_at
CREATE TRIGGER update_response_teams_updated_at BEFORE UPDATE ON response_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at BEFORE UPDATE ON incident_escalations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

