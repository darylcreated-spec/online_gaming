import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "the Win Concept | Lotto Plus Analytics & Wheeling Engine",
  description: "Advanced analytics dashboard, Number Line (Delta) analyzer, and combinatorial Wheeling System for Trinidad & Tobago NLCB Lotto Plus.",
  keywords: ["NLCB", "Lotto Plus", "Trinidad and Tobago", "the Win Concept", "Lottery Analytics", "Lottery Wheeling", "Deltas Analysis", "Winning Numbers"],
  authors: [{ name: "the Win Concept Team" }],
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
