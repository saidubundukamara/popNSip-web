"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A boolean the browser remembers, read the way React wants external state
 * read. The obvious version — `useState(false)` plus an effect that reads
 * `localStorage` — flashes the default for one frame and trips the
 * set-state-in-effect rule, both for the same underlying reason: it treats a
 * value that already exists as something to go and fetch.
 *
 * Every read is guarded. Private windows, blocked site data and embedded
 * webviews all throw here rather than returning null, and a preference that
 * cannot be saved must never take a screen down with it.
 */
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab on the same counter device should follow along.
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", notify);
  };
}

export function useStoredFlag(
  key: string,
  fallback = false,
): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const stored = window.localStorage.getItem(key);
        return stored === null ? fallback : stored === "1";
      } catch {
        return fallback;
      }
    },
    // The server has no storage, so it renders the fallback and the first
    // client read reconciles.
    () => fallback,
  );

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Nothing to persist to; the notify below still updates this tab.
      }
      notify();
    },
    [key],
  );

  return [value, set];
}
