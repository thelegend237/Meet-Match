import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2e2a5f",
};

export const metadata: Metadata = {
  title: {
    default: "Meet & Match — Rencontres sérieuses accompagnées",
    template: "%s | Meet & Match",
  },
  description:
    "Rencontrez des personnes sérieuses grâce à une mise en relation humaine. Créez votre profil, likez des profils, notre équipe vous met en relation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
