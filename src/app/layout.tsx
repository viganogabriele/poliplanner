// layout.tsx — Root Layout (Server Component)
//
// This wraps every page. It's a good place for:
//   - <html> attributes (language, theme)
//   - global metadata (title, description)
//   - CSS imports
//   - Fonts
//
// It runs on the server and is NOT re-rendered on navigation.
// In a single-page app like ours, it only runs once on load.

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ui/ServiceWorkerRegistrar";

// Metadata exported from here (or any page) is used by Next.js to
// populate <head> tags — title, description, icons, manifest link.
import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "Poliplanner",
  description: "Il tuo planner universitario — lezioni, esami e piano di studi",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#030303",
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full font-sans`}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
