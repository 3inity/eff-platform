import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://eff.netlify.app"),
  title: "EINITY FOOTBALL FEDERATION (EFF) | Official eSports Platform",
  description: "Official portal for Einity Football Federation (EFF) — Premier competitive eSports leagues, tournaments, FBref-grade player statistics, and live match analysis.",
  icons: {
    icon: "/branding/eff-logo.svg",
    shortcut: "/branding/eff-logo.svg",
    apple: "/branding/eff-logo.svg",
  },
  openGraph: {
    title: "Einity Football Federation (EFF)",
    description: "The Premier eSports Football Ecosystem. Sanctioned Tournaments, Live Standings, and Verified Match Analysis.",
    images: ["/branding/eff-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gradient-to-br from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
