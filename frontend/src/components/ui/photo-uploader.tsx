'use client';
import { useRef, useMemo } from 'react';
import Image from 'next/image';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE_MB = 5;

interface PhotoUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingUrls?: string[];
  onRemoveExisting?: (index: number) => void;
  maxPhotos?: number;
  uploading?: boolean;
}

export function PhotoUploader({
  files,
  onFilesChange,
  existingUrls = [],
  onRemoveExisting,
  maxPhotos = 8,
  uploading = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );

  const totalCount = existingUrls.length + files.length;

  const handleFiles = (fileList: FileList) => {
    const remaining = maxPhotos - totalCount;
    if (remaining <= 0) return;

    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(fileList)
      .slice(0, remaining)
      .forEach((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: invalid type`);
        } else if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          errors.push(`${file.name}: exceeds ${MAX_FILE_SIZE_MB}MB`);
        } else {
          valid.push(file);
        }
      });

    if (errors.length > 0) {
      alert(`Some files were skipped:\n${errors.join('\n')}`);
    }

    if (valid.length > 0) {
      onFilesChange([...files, ...valid]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {existingUrls.map((url, i) => (
          <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-wimc-border">
            <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 25vw, 120px" unoptimized />
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-wimc-red transition-colors"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ))}

        {previews.map((src, i) => (
          <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-wimc-border">
            <img src={src} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-wimc-red transition-colors"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ))}

        {totalCount < maxPhotos && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-wimc-border hover:border-wimc-border-alt flex flex-col items-center justify-center text-wimc-subtle hover:text-wimc-muted transition-colors"
          >
            <svg className="h-8 w-8 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">Add Photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <p className="text-xs text-wimc-subtle">{totalCount}/{maxPhotos} photos</p>
    </div>
  );
}
