import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#02326e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "the Win Concept | Lotto Plus Analytics & Wheeling Engine",
  description: "Advanced analytics dashboard, Number Line (Delta) analyzer, and combinatorial Wheeling System for Trinidad & Tobago NLCB Lotto Plus.",
  keywords: ["NLCB", "Lotto Plus", "Trinidad and Tobago", "the Win Concept", "Lottery Analytics", "Lottery Wheeling", "Deltas Analysis", "Winning Numbers"],
  authors: [{ name: "the Win Concept Team" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WinConcept",
    startupImage: [
      {
        url: "/images/splash/apple-splash-1179-2556.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/images/splash/apple-splash-1290-2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/images/splash/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      "/images/apple-splash.png",
    ],
  },
  icons: {
    icon: "/images/pwa-icon-192.png",
    shortcut: "/images/pwa-icon-192.png",
    apple: "/images/pwa-icon-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-base text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
