"use client";

import * as React from "react";
import { toast } from "sonner";

import { fetchQueue, type StaffOrder } from "@/lib/menu";
import { useOrderStream, type StreamMode } from "@/hooks/use-order-stream";
import { useStoredFlag } from "@/hooks/use-stored-flag";

/**
 * One live feed for the whole dashboard.
 *
 * FR-POS-3 exists because staff are not staring at the screen. The alert
 * therefore has to reach them wherever they are in the app, not only on the
 * queue — a cashier ringing up a walk-in on the POS is exactly the person who
 * will miss a delivery order otherwise. So the stream is owned here, in the
 * shell, and the queue board reads from it instead of opening its own.
 *
 * Two failures this fixes that the previous per-board version could not:
 *
 * - **A fresh kiosk tab was silent.** Browsers refuse to start an AudioContext
 *   without a gesture, so the chime never fired on a screen nobody had clicked
 *   — precisely the unattended counter screen it was written for. Sound is now
 *   armed by an explicit control, and the armed state is remembered.
 * - **One beep, once.** A single 350ms tone during service is missable. New
 *   orders now re-announce every 20s until someone acknowledges them, and the
 *   count sits in the tab title so a backgrounded tab still says so.
 */

const SOUND_KEY = "popnsip.alerts.sound";
const REANNOUNCE_MS = 20_000;

type AlertsContext = {
  orders: StaffOrder[] | null;
  mode: StreamMode;
  lastEventAt: Date | null;
  unseen: number;
  acknowledge: () => void;
  /** The person wants alert sounds. */
  soundWanted: boolean;
  /** An AudioContext is live, so a sound would actually be heard. */
  soundArmed: boolean;
  armSound: () => void;
  muteSound: () => void;
  refresh: () => void;
  /** Replace one order in place, so a transition does not redraw the board. */
  patch: (order: StaffOrder) => void;
  /**
   * Tell the feed that this session created an order, so it does not chime and
   * toast at the cashier about the order they are standing there holding.
   */
  noteOwnOrder: (id: string) => void;
};

const Context = React.createContext<AlertsContext | null>(null);

export function useOrderAlerts(): AlertsContext {
  const value = React.useContext(Context);
  if (!value) throw new Error("useOrderAlerts must be used inside OrderAlertsProvider");
  return value;
}

/** A two-tone chime carries further over kitchen noise than a single sine. */
function chime(ctx: AudioContext) {
  const at = ctx.currentTime;
  for (const [offset, freq] of [
    [0, 880],
    [0.16, 1174.7],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, at + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at + offset);
    osc.stop(at + offset + 0.24);
  }
}

export function OrderAlertsProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = React.useState<StaffOrder[] | null>(null);
  const [unseen, setUnseen] = React.useState(0);
  const [soundWanted, setSoundWanted] = useStoredFlag(SOUND_KEY);
  const [soundArmed, setSoundArmed] = React.useState(false);

  const known = React.useRef<Set<string> | null>(null);
  const ownOrders = React.useRef<Set<string>>(new Set());
  // `refresh` is handed to the stream hook once and held in a ref there, so it
  // must not close over changing state. The preference is read through a ref.
  const wantsSound = React.useRef(false);
  const audio = React.useRef<AudioContext | null>(null);
  const baseTitle = React.useRef<string>("");

  const play = React.useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    // A tab restored from bfcache comes back suspended.
    if (ctx.state === "suspended") void ctx.resume();
    try {
      chime(ctx);
    } catch {
      // An audio failure must never take the queue down with it.
    }
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const { orders: next } = await fetchQueue();
      setOrders(next);

      // The first load establishes what "already here" means; announcing the
      // backlog on every page load would train staff to ignore the sound.
      if (known.current === null) {
        known.current = new Set(next.map((order) => order.id));
        return;
      }

      const arrived = next.filter(
        (order) => !known.current!.has(order.id) && !ownOrders.current.has(order.id),
      );
      known.current = new Set(next.map((order) => order.id));
      if (arrived.length === 0) return;

      setUnseen((count) => count + arrived.length);
      if (wantsSound.current) play();
      toast.success(
        arrived.length === 1 ? `New order ${arrived[0].reference}` : `${arrived.length} new orders`,
        { description: "Tap the queue to accept it." },
      );
    } catch {
      // The stream hook owns retry and the freshness badge; a failed refresh
      // is already visible there. Leaving the previous orders on screen beats
      // blanking a board someone is working from.
    }
  }, [play]);

  const { mode, lastEventAt } = useOrderStream(refresh);

  // Populating the board on mount is synchronising with an external system,
  // which is what an effect is for. The rule cannot see that every setState
  // inside `refresh` happens after an awaited fetch, so nothing cascades.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    baseTitle.current = document.title;
  }, []);

  /** Build the AudioContext. Must be called from inside a user gesture. */
  const arm = React.useCallback((confirmWithChime: boolean) => {
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      setSoundArmed(true);
      if (confirmWithChime) chime(audio.current);
      return true;
    } catch {
      return false;
    }
  }, []);

  const armSound = React.useCallback(() => {
    setSoundWanted(true);
    // The chime doubles as proof it worked — the previous version gave no
    // way to find out the tab was mute until an order was already missed.
    if (!arm(true)) toast.error("This device would not play alert sounds.");
  }, [arm, setSoundWanted]);

  const muteSound = React.useCallback(() => setSoundWanted(false), [setSoundWanted]);

  /**
   * The preference survives a reload but the AudioContext cannot: a browser
   * will not start one without a gesture. Rather than leave a returning user
   * silently mute, take the next interaction anywhere on the page — a nav tap,
   * a keypress — as the gesture, once.
   */
  React.useEffect(() => {
    if (!soundWanted || soundArmed) return;
    const unlock = () => arm(false);
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((name) => document.addEventListener(name, unlock, { once: true }));
    return () => events.forEach((name) => document.removeEventListener(name, unlock));
  }, [soundWanted, soundArmed, arm]);

  // Re-announce until acknowledged. A single beep during service is missable.
  React.useEffect(() => {
    if (unseen === 0 || !soundWanted || !soundArmed) return;
    const timer = setInterval(play, REANNOUNCE_MS);
    return () => clearInterval(timer);
  }, [unseen, soundWanted, soundArmed, play]);

  // A backgrounded tab still has a title.
  React.useEffect(() => {
    document.title = unseen > 0 ? `(${unseen}) ${baseTitle.current}` : baseTitle.current;
  }, [unseen]);

  React.useEffect(() => {
    wantsSound.current = soundWanted;
  }, [soundWanted]);

  const acknowledge = React.useCallback(() => setUnseen(0), []);

  const noteOwnOrder = React.useCallback((id: string) => {
    ownOrders.current.add(id);
  }, []);

  const patch = React.useCallback((order: StaffOrder) => {
    setOrders((current) =>
      current ? current.map((existing) => (existing.id === order.id ? order : existing)) : current,
    );
  }, []);

  const value = React.useMemo<AlertsContext>(
    () => ({
      orders,
      mode,
      lastEventAt,
      unseen,
      acknowledge,
      soundWanted,
      soundArmed,
      armSound,
      muteSound,
      refresh: () => void refresh(),
      patch,
      noteOwnOrder,
    }),
    [
      orders,
      mode,
      lastEventAt,
      unseen,
      acknowledge,
      soundWanted,
      soundArmed,
      armSound,
      muteSound,
      refresh,
      patch,
      noteOwnOrder,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
