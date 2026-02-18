-- Storage bucket for resident verification documents (ID, proof of residence)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor). Safe to re-run.

-- Create bucket (public so admins can use getPublicUrl; paths contain user id)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-documents',
  'user-documents',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- Drop existing policies so this script is idempotent
DROP POLICY IF EXISTS "Users can upload own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read verification documents" ON storage.objects;

-- RLS: Allow authenticated users to upload only to their own verification folder
-- Path format: verification/<user_id>_id_<timestamp>.<ext> or verification/<user_id>_proof_<timestamp>.<ext>
CREATE POLICY "Users can upload own verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND (storage.foldername(name))[1] = 'verification'
  AND (name LIKE 'verification/' || auth.uid()::text || '_%')
);

-- RLS: Allow users to read their own verification files
CREATE POLICY "Users can read own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND name LIKE 'verification/' || auth.uid()::text || '_%'
);

-- RLS: Allow admins to read all verification documents (for Verify Residents page)
CREATE POLICY "Admins can read verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (storage.foldername(name))[1] = 'verification'
  AND public.get_user_role(auth.uid()) IN ('super_admin', 'municipal_admin', 'admin', 'mdrrmo')
);
