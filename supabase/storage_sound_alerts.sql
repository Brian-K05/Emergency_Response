-- Storage Setup for Sound Alerts
-- Creates storage bucket for sound alert audio files

-- Create storage bucket for sound alerts
INSERT INTO storage.buckets (id, name, public)
VALUES ('sound-alerts', 'sound-alerts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for sound-alerts bucket

-- Allow authenticated users to view/list sound alert files
CREATE POLICY "Authenticated users can view sound alerts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'sound-alerts'
        AND auth.role() = 'authenticated'
    );

-- Only super admin can upload sound alert files
CREATE POLICY "Super admin can upload sound alerts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'sound-alerts'
        AND public.get_user_role(auth.uid()) = 'super_admin'
    );

-- Only super admin can update sound alert files
CREATE POLICY "Super admin can update sound alerts"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'sound-alerts'
        AND public.get_user_role(auth.uid()) = 'super_admin'
    );

-- Only super admin can delete sound alert files
CREATE POLICY "Super admin can delete sound alerts"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'sound-alerts'
        AND public.get_user_role(auth.uid()) = 'super_admin'
    );

