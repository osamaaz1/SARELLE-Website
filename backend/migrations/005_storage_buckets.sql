-- =============================================
-- Migration 005: Supabase Storage Buckets
-- Creates storage buckets for listing photos and avatars
-- =============================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('wimc-listings', 'wimc-listings', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('wimc-avatars', 'wimc-avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RLS Policies for wimc-listings bucket
-- =============================================

-- Anyone can view listing photos (public bucket)
CREATE POLICY "Public read access for listings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wimc-listings');

-- Authenticated users can upload to their own submissions folder
CREATE POLICY "Sellers can upload submission photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wimc-listings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own submission photos
CREATE POLICY "Sellers can delete own submission photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wimc-listings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- =============================================
-- RLS Policies for wimc-avatars bucket
-- =============================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wimc-avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wimc-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wimc-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wimc-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
