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
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ttonlinegaming.vercel.app"),
  title: "The Win Concept | NLCB Analytics",
  description: "Understand exact odds, compare ticket budgets, and remove overlapping plays across Cash Pot, Lotto Plus, Win For Life, Play Whe, Pick 4, and Fast Cash in Trinidad and Tobago.",
  keywords: ["NLCB", "Cash Pot", "Lotto Plus", "Win For Life", "Play Whe", "Pick 4", "Fast Cash", "Trinidad and Tobago", "The Win Concept"],
  authors: [{ name: "The Win Concept" }],
  openGraph: {
    title: "The Win Concept | NLCB Analytics",
    description: "Understand exact odds, compare ticket budgets, and remove overlapping plays across all 6 NLCB games in Trinidad and Tobago.",
    url: "https://ttonlinegaming.vercel.app/",
    siteName: "The Win Concept",
    locale: "en_TT",
    type: "website",
    images: [
      {
        url: "/images/pwa-icon-512.png",
        width: 512,
        height: 512,
        alt: "The Win Concept - NLCB Analytics"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "The Win Concept | NLCB Analytics",
    description: "Understand exact odds, compare ticket budgets, and remove overlapping plays across all 6 NLCB games.",
    images: ["/images/pwa-icon-512.png"]
  },
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

import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";

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
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
