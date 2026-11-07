"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/actions";
import { Icon } from "./icon";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const DISMISS_KEY = "ifgf-push-banner-dismissed";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

function base64UrlToBytes(value: string) {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Lets someone turn on phone/browser notifications for this device.
 * `banner` (home page) only appears when there's something to do and can be dismissed;
 * `full` (inbox) always shows the current state.
 */
export function PushToggle({ variant }: { variant: "banner" | "full" }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const set = (s: Status) => !cancelled && setStatus(s);
    (async () => {
      try {
        if (variant === "banner" && localStorage.getItem(DISMISS_KEY)) setDismissed(true);
      } catch {}
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const installed =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        // iPhones only allow notifications once the app is added to the Home Screen.
        return set(isIOS && !installed ? "ios-install" : "unsupported");
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const existing = await registration.pushManager.getSubscription();
      if (existing && Notification.permission === "granted") {
        // Re-link in case someone else signed in on this device before.
        await savePushSubscription(existing.toJSON());
        return set("on");
      }
      set(Notification.permission === "denied" ? "denied" : "off");
    })().catch(() => set("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [variant]);

  async function enable() {
    setStatus("busy");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY!),
      });
      await savePushSubscription(subscription.toJSON());
      setStatus("on");
    } catch {
      setStatus("off");
      setError("Couldn't turn on notifications. Please try again.");
    }
  }

  async function disable() {
    setStatus("busy");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("off");
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  if (variant === "banner" && (dismissed || !["ios-install", "off", "busy"].includes(status))) return null;
  if (status === "loading") return null;

  if (status === "on") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
        <Icon name="bell" className="size-4" />
        <span className="flex-1">Notifications are on for this device.</span>
        <button type="button" onClick={disable} className="text-xs underline">
          Turn off
        </button>
      </div>
    );
  }

  if (status === "unsupported") {
    return <p className="text-xs text-black/50">This browser can&apos;t show notifications. Check this inbox instead.</p>;
  }

  if (status === "denied") {
    return (
      <p className="rounded-lg bg-black/5 px-3 py-2 text-xs text-black/60">
        Notifications are blocked for this site. To get ride updates, allow notifications for IFGF Rides in your
        phone or browser settings.
      </p>
    );
  }

  return (
    <div className="card space-y-3 border-accent/60 bg-accent-soft">
      <div className="flex items-start gap-3">
        <Icon name="bell" className="mt-0.5 size-6 shrink-0 text-accent" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Get notified on your phone</p>
          <p className="text-black/70">
            When a driver accepts, when someone near you needs a ride, and a reminder every Friday.
          </p>
        </div>
      </div>
      {status === "ios-install" ? (
        <p className="rounded-lg bg-white px-3 py-2 text-sm">
          On iPhone: tap <Icon name="share" className="inline size-4 align-text-bottom" /> <b>Share</b> →{" "}
          <b>Add to Home Screen</b>, then open IFGF Rides from your home screen and turn notifications on there.
        </p>
      ) : (
        <button type="button" onClick={enable} disabled={status === "busy"} className="btn-accent w-full">
          {status === "busy" ? "Turning on…" : "Turn on notifications"}
        </button>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
      {variant === "banner" && (
        <button type="button" onClick={dismiss} className="w-full text-center text-xs text-black/50 underline">
          Not now
        </button>
      )}
    </div>
  );
}
