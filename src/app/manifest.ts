import type { MetadataRoute } from "next";

// File speciale Next.js: generato automaticamente su /manifest.webmanifest
// e collegato in automatico nell'head (nessun <link> manuale necessario).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Torneo Padel",
    short_name: "Torneo Padel",
    description: "Gestione torneo di padel a 7 giocatori",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2ee",
    theme_color: "#115e59",
    lang: "it",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
