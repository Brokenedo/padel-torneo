import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Risorse PWA (manifest, icone, service worker) devono restare accessibili senza
// autenticazione: il browser le richiede senza inviare i cookie di sessione.
const PUBLIC_PATHS = [
  "/manifest.webmanifest",
  "/sw.js",
  "/icon",
  "/apple-icon",
  "/pwa-icon-192",
  "/pwa-icon-512",
];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAsset = PUBLIC_PATHS.some((path) => req.nextUrl.pathname === path);

  if (isApiAuthRoute || isPublicAsset) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
