'use client';
import { useState } from 'react';

interface ImageGalleryProps {
  photos: string[];
  name: string;
}

export function ImageGallery({ photos, name }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!photos.length) {
    return (
      <div className="aspect-[3/4] bg-wimc-surface-alt rounded-xl flex items-center justify-center text-wimc-subtle">
        No photos available
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div
          className="aspect-[3/4] bg-[#1A1A1A] rounded-2xl overflow-hidden cursor-zoom-in max-h-[520px]"
          onClick={() => setLightboxOpen(true)}
        >
          <img src={photos[selected]} alt={`${name} - ${selected + 1}`} className="w-full h-full object-cover" />
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === selected ? 'border-wimc-red' : 'border-transparent hover:border-wimc-border-alt'
                }`}
              >
                <img src={photo} alt={`${name} - ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxOpen(false)}>
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {selected > 0 && (
            <button className="absolute left-4 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setSelected(selected - 1); }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          <img src={photos[selected]} alt={name} className="max-h-[85vh] max-w-[85vw] object-contain" onClick={(e) => e.stopPropagation()} />
          {selected < photos.length - 1 && (
            <button className="absolute right-4 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setSelected(selected + 1); }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
