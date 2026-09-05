"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable.
 *
 * Production only: in development a service worker caches build output that
 * changes on every save, which makes it look like your edits are not applying.
 * To exercise the PWA locally run `next build && next start` — localhost
 * counts as a secure origin, so install still works.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register(
          new URL("../../lib/service-worker.js", import.meta.url),
          { scope: "/", updateViaCache: "none" }
        );
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    void register();
  }, []);

  return null;
}
