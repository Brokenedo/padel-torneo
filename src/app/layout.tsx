import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPwaButton } from "@/components/InstallPwaButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Torneo Padel",
  description: "Gestione torneo di padel a 7 giocatori",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Torneo Padel",
  },
};

export const viewport: Viewport = {
  themeColor: "#115e59",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-slate-900">
        <ServiceWorkerRegister />
        <InstallPwaButton />
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
