"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "@/lib/api-client";

/**
 * The live order feed (FR-POS-2).
 *
 * The polling fallback is a requirement, not a nicety: after three failed
 * reconnects inside a minute the hook switches to polling and keeps retrying
 * the stream in the background, so a proxy that mangles text/event-stream
 * degrades the queue rather than breaking it. Staff see no difference beyond
 * the freshness indicator.
 */

export type StreamMode = "connecting" | "live" | "polling";

const FAILURE_WINDOW_MS = 60_000;
const FAILURES_BEFORE_FALLBACK = 3;
const POLL_INTERVAL_MS = 10_000;
/** How often to try the stream again once we have fallen back. */
const STREAM_RETRY_MS = 30_000;

export function useOrderStream(onChange: () => void): { mode: StreamMode; lastEventAt: Date | null } {
  const [mode, setMode] = useState<StreamMode>("connecting");
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  // Held in refs so reconnect bookkeeping never re-runs the effect, and so a
  // new onChange identity does not tear down a working stream.
  const failures = useRef<number[]>([]);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const noteChange = useCallback(() => {
    setLastEventAt(new Date());
    onChangeRef.current();
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };

    const startPolling = () => {
      if (pollTimer || disposed) return;
      setMode("polling");
      pollTimer = setInterval(() => onChangeRef.current(), POLL_INTERVAL_MS);
      // Keep trying the stream; a transient proxy problem should heal itself.
      retryTimer = setTimeout(connect, STREAM_RETRY_MS);
    };

    function connect() {
      if (disposed) return;

      source?.close();
      source = new EventSource(`${API_BASE_URL}/api/staff/orders/stream`, { withCredentials: true });

      source.onopen = () => {
        if (disposed) return;
        failures.current = [];
        stopPolling();
        if (retryTimer) clearTimeout(retryTimer);
        setMode("live");
      };

      for (const name of ["order.created", "order.updated", "order.status_changed"]) {
        source.addEventListener(name, () => {
          if (!disposed) noteChange();
        });
      }

      source.onerror = () => {
        if (disposed) return;

        const now = Date.now();
        failures.current = [...failures.current.filter((at) => now - at < FAILURE_WINDOW_MS), now];

        if (failures.current.length >= FAILURES_BEFORE_FALLBACK) {
          // EventSource would keep retrying on its own; stop it so the two
          // mechanisms do not both run.
          source?.close();
          source = null;
          startPolling();
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      source?.close();
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [noteChange]);

  return { mode, lastEventAt };
}
