"use client";

import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandaloneDisplay());
  const isIos = useMemo(
    () => typeof navigator !== "undefined" && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()),
    []
  );
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || (!deferredPrompt && !isIos)) {
    return null;
  }

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    // iOS Safari non supporta il prompt nativo: mostriamo le istruzioni manuali
    setShowIosHint(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {showIosHint && (
        <div className="max-w-64 rounded-lg bg-white shadow-lg border border-black/10 p-3 text-xs text-slate-600">
          Tocca <span className="font-semibold">Condividi</span> (icona{" "}
          <span aria-hidden>⬆️</span>) e poi{" "}
          <span className="font-semibold">&quot;Aggiungi a Home&quot;</span> per installare
          l&apos;app.
          <button
            type="button"
            onClick={() => setShowIosHint(false)}
            className="block mt-2 text-primary font-medium cursor-pointer"
          >
            Ho capito
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 rounded-full bg-primary text-white text-sm font-medium px-4 py-2.5 shadow-lg hover:bg-primary-dark cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        Installa app
      </button>
    </div>
  );
}
