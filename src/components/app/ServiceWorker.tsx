"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker — but ONLY in production. In development the
 * SW would cache Next.js/HMR chunks and then serve stale ones after a rebuild,
 * crashing the app with "module factory is not available". In dev (or if the
 * SW is disabled) we actively unregister any existing worker and clear its
 * caches so machines that previously registered one recover automatically.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const isProd = process.env.NODE_ENV === "production";

    if (!isProd) {
      // Dev / disabled: tear down any previously-registered worker + caches.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
