'use client';

import { useState, useEffect } from 'react';

const listeners = new Set<() => void>();
let globalInterval: ReturnType<typeof setInterval> | null = null;

function tick() {
  listeners.forEach((fn) => fn());
}

function calcRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

/**
 * Shared countdown hook — uses a SINGLE global setInterval
 * instead of one per component. 20 auction cards = 1 timer.
 */
export function useSharedCountdown(endsAt: string | null) {
  const [text, setText] = useState(() => (endsAt ? calcRemaining(endsAt) : ''));

  useEffect(() => {
    if (!endsAt) return;

    const update = () => setText(calcRemaining(endsAt));
    update();
    listeners.add(update);

    if (!globalInterval) {
      globalInterval = setInterval(tick, 60000);
    }

    return () => {
      listeners.delete(update);
      if (listeners.size === 0 && globalInterval) {
        clearInterval(globalInterval);
        globalInterval = null;
      }
    };
  }, [endsAt]);

  return text;
}
