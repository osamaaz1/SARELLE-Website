'use client';
import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { mouseDownTarget.current = e.target; }}
      onClick={(e) => {
        // Only close if both mousedown AND mouseup happened on the overlay
        // This prevents closing when selecting text inside the modal
        if (e.target === overlayRef.current && mouseDownTarget.current === overlayRef.current) onClose();
      }}
    >
      <div className={`${maxWidth} w-full bg-wimc-surface border border-wimc-border rounded-2xl shadow-2xl animate-fade-in`}>
        {title && (
          <div className="flex items-center justify-between p-6 pb-0 mb-4">
            <h3 className="font-heading text-xl font-semibold">{title}</h3>
            <button onClick={onClose} className="text-wimc-subtle hover:text-white transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6 pb-7">{children}</div>
      </div>
    </div>
  );
}
