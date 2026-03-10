'use client';
import { useState, useRef, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0 && window.scrollY === 0) {
      // Apply resistance curve
      const distance = Math.min(deltaY * 0.5, 120);
      setPullDistance(distance);
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? pullDistance : 0, opacity: progress }}
      >
        <div className={`${refreshing ? 'animate-spin' : ''}`}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#888"
            strokeWidth="2"
            strokeLinecap="round"
            className="transition-transform duration-200"
            style={{ transform: `rotate(${progress * 360}deg)` }}
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}
