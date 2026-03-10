'use client';
import Image from 'next/image';
import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageGalleryProps {
  photos: string[];
  name: string;
}

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchDelta = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDelta.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    touchDelta.current = e.touches[0].clientX - touchStart.current.x;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current) return;
    const delta = touchDelta.current;
    const threshold = 50;
    if (delta < -threshold) onSwipeLeft();
    else if (delta > threshold) onSwipeRight();
    touchStart.current = null;
    touchDelta.current = 0;
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export function ImageGallery({ photos, name }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});

  const goNext = useCallback(() => {
    setSelected((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setSelected((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Reset zoom when image changes
  useEffect(() => {
    setIsHovering(false);
    setZoomStyle({});
  }, [selected]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(1.6)',
      transition: 'transform 0.15s ease-out',
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setZoomStyle({
      transform: 'scale(1)',
      transition: 'transform 0.4s ease-out',
    });
  }, []);

  const mainSwipe = useSwipe(goNext, goPrev);
  const lightboxSwipe = useSwipe(goNext, goPrev);

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
        {/* Main image — swipeable */}
        <div
          className="aspect-[3/4] bg-[#1A1A1A] rounded-2xl overflow-hidden cursor-zoom-in max-h-[520px] relative select-none"
          onClick={() => setLightboxOpen(true)}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          {...mainSwipe}
        >
          <Image
            src={photos[selected]}
            alt={`${name} - ${selected + 1}`}
            fill
            className="object-cover pointer-events-none"
            style={isHovering ? zoomStyle : { transform: 'scale(1)', transition: 'transform 0.4s ease-out' }}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            draggable={false}
          />

          {/* Dot indicators on mobile */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === selected ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Prev/Next arrows on mobile */}
          {photos.length > 1 && selected > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white/80 sm:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {photos.length > 1 && selected < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white/80 sm:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>

        {/* Thumbnails — larger touch targets */}
        {photos.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
            {photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden border-2 transition-colors relative ${
                  i === selected ? 'border-wimc-red' : 'border-transparent hover:border-wimc-border-alt'
                }`}
              >
                <Image src={photo} alt={`${name} - ${i + 1}`} fill className="object-cover" sizes="72px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox — swipeable */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button — 44px touch target */}
          <button
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-white/70 hover:text-white"
            onClick={() => setLightboxOpen(false)}
          >
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Prev button */}
          {selected > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white rounded-full bg-white/10"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
            >
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}

          {/* Image — swipeable in lightbox */}
          <div
            className="max-h-[85vh] max-w-[90vw] sm:max-w-[85vw] select-none"
            onClick={(e) => e.stopPropagation()}
            {...lightboxSwipe}
          >
            <Image
              src={photos[selected]}
              alt={name}
              width={900}
              height={1200}
              className="max-h-[85vh] max-w-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Next button */}
          {selected < photos.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white rounded-full bg-white/10"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
            >
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {selected + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
