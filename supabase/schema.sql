-- Emergency Response Platform Database Schema
-- For Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Municipalities Table
CREATE TABLE municipalities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barangays Table
CREATE TABLE barangays (
    id BIGSERIAL PRIMARY KEY,
    municipality_id BIGINT REFERENCES municipalities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (using Supabase auth.users for authentication)
-- This table extends Supabase auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    civil_status VARCHAR(20) CHECK (civil_status IN ('single', 'married', 'divorced', 'widowed')),
    educational_attainment VARCHAR(255),
    trainings_seminars_attended TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'resident' CHECK (role IN ('super_admin', 'municipal_admin', 'admin', 'mdrrmo', 'barangay_official', 'resident')),
    municipality_id BIGINT REFERENCES municipalities(id) ON DELETE SET NULL,
    barangay_id BIGINT REFERENCES barangays(id) ON DELETE SET NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents Table
CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('fire', 'medical', 'accident', 'natural_disaster', 'crime', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_address VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    barangay_id BIGINT REFERENCES barangays(id) ON DELETE SET NULL,
    municipality_id BIGINT REFERENCES municipalities(id) ON DELETE SET NULL,
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'assigned', 'in_progress', 'resolved', 'cancelled')),
    contact_number VARCHAR(20),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Media Table
CREATE TABLE incident_media (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'video')),
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments Table
CREATE TABLE assignments (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Updates Table
CREATE TABLE incident_updates (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    update_message TEXT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_municipality ON public.users(municipality_id);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_municipality ON incidents(municipality_id);
CREATE INDEX idx_incidents_created ON incidents(created_at);
CREATE INDEX idx_assignments_responder ON assignments(responder_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- Create Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply Updated At Triggers
CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON municipalities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barangays_updated_at BEFORE UPDATE ON barangays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_media_updated_at BEFORE UPDATE ON incident_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_updates_updated_at BEFORE UPDATE ON incident_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

