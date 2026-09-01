"use client";

import { useSyncExternalStore } from "react";

/**
 * One clock for the whole board. A busy queue holds thirty-odd order cards
 * and every one of them shows an ageing figure; thirty independent intervals
 * would each wake the tab on its own schedule. This ticks once and everybody
 * re-reads it.
 *
 * The interval only starts once something is subscribed, so a screen with no
 * ageing elements costs nothing.
 */
const TICK_MS = 15_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// The server has no clock to share, so it renders the epoch that produced the
// markup; the first client tick corrects it. Hydration sees the same value.
const getServerSnapshot = () => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, getServerSnapshot);
}
