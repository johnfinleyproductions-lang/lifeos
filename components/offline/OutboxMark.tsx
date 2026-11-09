"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  flush,
  onOutboxChange,
  pending,
  rememberWho,
  sendable,
  type Who,
} from "@/lib/offline/outbox";

const RETRY_EVERY_MS = 20_000;

/**
 * The small mark in the corner that says writing is waiting to be sent, and
 * the thing that sends it.
 *
 * It sits in the page shell, so it is on every screen. While something is
 * waiting it tries again when the connection returns, when the window comes
 * back into view, and every twenty seconds in between. When a send goes
 * through, the page behind it is refreshed so the words appear where they
 * belong.
 *
 * It also registers the service worker that keeps the offline desk
 * reachable in a browser with no connection. The Mac app does not need
 * that (its pages are served from the Mac itself) and does not get it.
 */
export function OutboxMark({ who }: { who: Who | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [waiting, setWaiting] = useState(0);
  const [held, setHeld] = useState(0);

  const before = useRef<number | null>(null);
  const refresh = useRef<number | null>(null);

  const count = useCallback(() => {
    const items = pending();
    const live = sendable(items);
    setWaiting(live);
    setHeld(items.length - live);
    // Fewer than a moment ago means something was sent, by this tab or by
    // another one. Either way this page is now behind: reload its data,
    // once, after the run of sends has settled.
    if (before.current !== null && items.length < before.current) {
      if (refresh.current !== null) window.clearTimeout(refresh.current);
      refresh.current = window.setTimeout(() => router.refresh(), 600);
    }
    before.current = items.length;
  }, [router]);

  const send = useCallback(async () => {
    if (!who) return;
    if (sendable() === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    await flush(who.slug);
  }, [who]);

  useEffect(() => {
    rememberWho(who);
  }, [who]);

  useEffect(() => {
    count();
    return onOutboxChange(count);
  }, [count]);

  useEffect(() => {
    void send();
    const onVisible = () => {
      if (document.visibilityState === "visible") void send();
    };
    const onOnline = () => void send();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void send(), RETRY_EVERY_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [send]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No service worker, no offline page in the browser. Writing that is
      // already on screen is still kept.
    });
  }, []);

  const total = waiting + held;
  if (total === 0 || pathname === "/offline") return null;

  return (
    <Link
      href="/offline"
      id="outbox-mark"
      className="tab fixed z-[60] right-3 md:right-5 no-underline shadow-[3px_3px_0_rgb(var(--line))]"
      style={{ bottom: "calc(14px + env(safe-area-inset-bottom))" }}
      aria-live="polite"
      title="Kept on this device. It sends when LifeOS can reach your data."
    >
      <span
        aria-hidden
        className="inline-block w-[9px] h-[9px] border-[1.5px] border-current"
      />
      {waiting > 0
        ? `${waiting} waiting to send`
        : `${held} could not be sent`}
    </Link>
  );
}
