# Module: Storage

## Ownership
- Backend: `backend/src/storage/`
- Frontend: `frontend/src/lib/api.ts` (upload methods)
- Migration: `backend/migrations/005_storage_buckets.sql`

## Purpose
Handles file uploads (photos, avatars) to Supabase Storage with MIME validation and size limits.

## Backend Components

### StorageService (`storage.service.ts`)
- `validateFile(file, maxSizeMB)` — Check MIME type and file size
- `uploadFile(bucket, folder, file)` — Upload single file, returns public URL
- `uploadFiles(bucket, folder, files[])` — Upload multiple files
- `deleteFile(bucket, path)` — Remove file from storage
- `getPublicUrl(bucket, path)` — Generate public URL for a stored file

### StorageController (`storage.controller.ts`)
Uses Multer `FileInterceptor` / `FilesInterceptor` for multipart upload handling.

| Method | Path | Auth | Roles | Max Files | Max Size | Bucket |
|--------|------|------|-------|-----------|----------|--------|
| POST | `/storage/submission-photos/:submissionId` | JWT | seller | 8 | 5MB each | wimc-listings |
| POST | `/storage/listing-photos/:submissionId` | JWT | admin | 12 | 5MB each | wimc-listings |
| POST | `/storage/avatar` | JWT | any | 1 | 2MB | wimc-avatars |
| POST | `/storage/celebrity-avatar/:celebrityId` | JWT | admin | 1 | 2MB | wimc-avatars |

### StorageModule (`storage.module.ts`)
- Imports: `AuthModule`
- Providers: `StorageService`
- Controllers: `StorageController`

## Allowed File Types
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/heic`

## Supabase Storage Buckets
Created by migration `005_storage_buckets.sql`:

| Bucket | Purpose | Max File Size | Public |
|--------|---------|--------------|--------|
| `wimc-listings` | Submission + listing photos | 5MB | Yes |
| `wimc-avatars` | User + celebrity avatars | 2MB | Yes |

## Frontend API Methods
```
api.uploadSubmissionPhotos(submissionId, files)  → POST /storage/submission-photos/:id
api.uploadListingPhotos(submissionId, files)     → POST /storage/listing-photos/:id
api.uploadAvatar(file)                           → POST /storage/avatar
api.uploadCelebrityAvatar(celebrityId, file)     → POST /storage/celebrity-avatar/:id
```

All methods use `FormData` for multipart upload. Mock mode returns `URL.createObjectURL()` for previews.

## File Naming
Uploaded files are renamed with UUID to prevent collisions:
`{folder}/{uuid}-{originalname}`

## Known Gaps
- Frontend PhotoUploader in seller submit form not yet wired to call upload endpoint during submission flow
- No image compression/optimization before upload
- No image cropping UI
- No drag-and-drop upload experience
