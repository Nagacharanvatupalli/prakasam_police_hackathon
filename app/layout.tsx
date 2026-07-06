import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TRINETHRA — AI Vehicle Intelligence Platform",
    template: "%s | TRINETHRA",
  },
  description: "TRINETHRA is India's premier AI-powered Vehicle Intelligence Platform enabling law enforcement to identify, verify, monitor, and investigate suspicious vehicle activities using existing CCTV infrastructure.",
  keywords: ["AI", "Vehicle Intelligence", "ANPR", "Police", "CCTV", "Smart Policing", "India", "Prakasam Police"],
  authors: [{ name: "Prakasam Police Mission Youth4 Hackathon 2026" }],
  openGraph: {
    type: "website",
    title: "TRINETHRA — AI Vehicle Intelligence Platform",
    description: "See. Verify. Track. Protect.",
    siteName: "TRINETHRA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRINETHRA — AI Vehicle Intelligence Platform",
    description: "See. Verify. Track. Protect.",
  },
  robots: { index: true, follow: true },
  themeColor: "#070E1F",
  viewport: { width: "device-width", initialScale: 1 },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
