-- Sound Alerts Management System
-- Allows super admin to upload and assign custom sound files for different alert types

-- Sound Alerts Configuration Table
CREATE TABLE IF NOT EXISTS sound_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(50) UNIQUE NOT NULL CHECK (alert_type IN ('emergency', 'assignment', 'escalation')),
    sound_file_path VARCHAR(500) NOT NULL, -- Path in storage bucket
    sound_file_name VARCHAR(255) NOT NULL,
    volume DECIMAL(3, 2) DEFAULT 0.7 CHECK (volume >= 0 AND volume <= 1),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sound_alerts_type ON sound_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_sound_alerts_active ON sound_alerts(is_active);

-- RLS Policies
ALTER TABLE sound_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can view active sound alerts
CREATE POLICY "Anyone can view active sound alerts"
    ON sound_alerts FOR SELECT
    USING (is_active = TRUE);

-- Only super admin can manage sound alerts
CREATE POLICY "Super admin can manage sound alerts"
    ON sound_alerts FOR ALL
    USING (
        public.get_user_role(auth.uid()) = 'super_admin'
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'super_admin'
    );

-- Trigger for updated_at
CREATE TRIGGER update_sound_alerts_updated_at BEFORE UPDATE ON sound_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default sound alerts (will be replaced when super admin uploads custom sounds)
INSERT INTO sound_alerts (alert_type, sound_file_path, sound_file_name, volume, is_active, created_at, updated_at)
VALUES
    ('emergency', 'default', 'default_emergency', 0.7, TRUE, NOW(), NOW()),
    ('assignment', 'default', 'default_assignment', 0.7, TRUE, NOW(), NOW()),
    ('escalation', 'default', 'default_escalation', 0.7, TRUE, NOW(), NOW())
ON CONFLICT (alert_type) DO NOTHING;

