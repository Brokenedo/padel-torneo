"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Solo in produzione: in dev la cache-first del service worker sulle risorse
    // _next/static puo' servire chunk JS obsoleti dopo ogni modifica, causando
    // falsi errori di hydration mismatch che non hanno nulla a che fare col codice.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registrazione fallita (es. browser non supportato): nessun impatto sull'app
      });
    }
  }, []);

  return null;
}
