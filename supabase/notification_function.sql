-- Enhanced Notification System for Emergency Response
-- This function automatically notifies relevant users when an incident is reported

-- Function to notify relevant users about a new incident
CREATE OR REPLACE FUNCTION public.notify_incident_reported()
RETURNS TRIGGER AS $$
DECLARE
    barangay_official_record RECORD;
    mdrrmo_staff_record RECORD;
    responder_record RECORD;
    notification_message TEXT;
BEGIN
    -- Notification message template
    notification_message := 'New ' || NEW.incident_type || ' incident reported: ' || NEW.title || 
                           ' in ' || COALESCE((SELECT name FROM barangays WHERE id = NEW.barangay_id), 'your area') ||
                           '. Urgency: ' || NEW.urgency_level;

    -- 1. NOTIFY BARANGAY OFFICIALS (Priority 1 - Fastest Response)
    -- Notify all barangay officials in the incident's barangay
    IF NEW.barangay_id IS NOT NULL THEN
        FOR barangay_official_record IN
            SELECT id FROM public.users
            WHERE role = 'barangay_official'
            AND barangay_id = NEW.barangay_id
            AND is_active = TRUE
        LOOP
            INSERT INTO public.notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message,
                is_read
            ) VALUES (
                barangay_official_record.id,
                NEW.id,
                'new_incident',
                '🚨 New Incident in Your Barangay',
                notification_message || ' - Your immediate response is needed.',
                FALSE
            );
        END LOOP;
    END IF;

    -- 2. NOTIFY MDRRMO STAFF (Awareness - Municipal Level)
    -- Notify all MDRRMO staff in the incident's municipality
    IF NEW.municipality_id IS NOT NULL THEN
        FOR mdrrmo_staff_record IN
            SELECT id FROM public.users
            WHERE role = 'mdrrmo'
            AND municipality_id = NEW.municipality_id
            AND is_active = TRUE
        LOOP
            INSERT INTO public.notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message,
                is_read
            ) VALUES (
                mdrrmo_staff_record.id,
                NEW.id,
                'new_incident',
                '📋 New Incident Reported',
                notification_message || ' - Please monitor and coordinate response.',
                FALSE
            );
        END LOOP;
    END IF;

    -- 3. NOTIFY EMERGENCY RESPONDERS (Based on Incident Type and Urgency)
    -- Auto-notify responders if urgency is HIGH or CRITICAL, or if specific incident types
    IF NEW.urgency_level IN ('high', 'critical') OR NEW.incident_type IN ('crime', 'fire', 'medical') THEN
        IF NEW.municipality_id IS NOT NULL THEN
            FOR responder_record IN
                SELECT id FROM public.users
                WHERE role = 'responder'
                AND municipality_id = NEW.municipality_id
                AND is_active = TRUE
            LOOP
                INSERT INTO public.notifications (
                    user_id,
                    incident_id,
                    notification_type,
                    title,
                    message,
                    is_read
                ) VALUES (
                    responder_record.id,
                    NEW.id,
                    'new_incident',
                    '⚡ Urgent: Response Needed',
                    notification_message || ' - Standby for possible assignment.',
                    FALSE
                );
            END LOOP;
        END IF;
    END IF;

    -- 4. NOTIFY REPORTER (Confirmation)
    INSERT INTO public.notifications (
        user_id,
        incident_id,
        notification_type,
        title,
        message,
        is_read
    ) VALUES (
        NEW.reporter_id,
        NEW.id,
        'incident_reported',
        '✅ Incident Reported Successfully',
        'Your incident has been reported. Barangay officials and MDRRMO have been notified. Response teams will be dispatched soon.',
        FALSE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically notify when incident is created
DROP TRIGGER IF EXISTS trigger_notify_incident_reported ON incidents;
CREATE TRIGGER trigger_notify_incident_reported
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_incident_reported();

-- Function to handle escalation requests
CREATE OR REPLACE FUNCTION public.request_municipal_assistance(
    p_incident_id BIGINT,
    p_requested_by UUID,
    p_assistance_message TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    incident_record RECORD;
    mdrrmo_staff_record RECORD;
    responder_record RECORD;
BEGIN
    -- Get incident details
    SELECT * INTO incident_record
    FROM incidents
    WHERE id = p_incident_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident not found';
    END IF;

    -- Notify all MDRRMO staff with escalation message
    IF incident_record.municipality_id IS NOT NULL THEN
        FOR mdrrmo_staff_record IN
            SELECT id FROM public.users
            WHERE role = 'mdrrmo'
            AND municipality_id = incident_record.municipality_id
            AND is_active = TRUE
        LOOP
            INSERT INTO public.notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message,
                is_read
            ) VALUES (
                mdrrmo_staff_record.id,
                p_incident_id,
                'escalation_request',
                '🚨 ESCALATION: Assistance Requested',
                'Barangay officials have requested municipal assistance for incident: ' || 
                incident_record.title || '. Request: ' || p_assistance_message ||
                ' - Please coordinate additional resources immediately.',
                FALSE
            );
        END LOOP;

        -- Also notify all responders in municipality
        FOR responder_record IN
            SELECT id FROM public.users
            WHERE role = 'responder'
            AND municipality_id = incident_record.municipality_id
            AND is_active = TRUE
        LOOP
            INSERT INTO public.notifications (
                user_id,
                incident_id,
                notification_type,
                title,
                message,
                is_read
            ) VALUES (
                responder_record.id,
                p_incident_id,
                'escalation_request',
                '⚡ URGENT: Municipal Assistance Needed',
                'Escalation request for incident: ' || incident_record.title || 
                '. ' || p_assistance_message || ' - Standby for immediate dispatch.',
                FALSE
            );
        END LOOP;
    END IF;

    -- Create incident update log
    INSERT INTO incident_updates (
        incident_id,
        updated_by,
        update_message,
        new_status
    ) VALUES (
        p_incident_id,
        p_requested_by,
        'Municipal assistance requested: ' || p_assistance_message,
        'assigned'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.request_municipal_assistance(BIGINT, UUID, TEXT) TO authenticated;

-- Function for auto-escalation based on time (can be called by scheduled job)
CREATE OR REPLACE FUNCTION public.auto_escalate_unresponded_incidents()
RETURNS INTEGER AS $$
DECLARE
    incident_record RECORD;
    escalated_count INTEGER := 0;
BEGIN
    -- Find incidents that are still "reported" after 15 minutes and escalate
    FOR incident_record IN
        SELECT id, title, municipality_id, urgency_level
        FROM incidents
        WHERE status = 'reported'
        AND created_at < NOW() - INTERVAL '15 minutes'
        AND municipality_id IS NOT NULL
    LOOP
        -- Auto-escalate to MDRRMO
        PERFORM public.request_municipal_assistance(
            incident_record.id,
            NULL, -- System auto-escalation
            'Auto-escalated: No response received within 15 minutes. Urgency: ' || incident_record.urgency_level
        );
        
        escalated_count := escalated_count + 1;
    END LOOP;

    RETURN escalated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

