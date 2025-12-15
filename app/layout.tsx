import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import AuthProvider from "../components/AuthProvider";
import { AutoRefreshProvider } from "../components/AutoRefreshProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    template: "%s - PortfolioTrack",
    default: "PortfolioTrack - PSX Portfolio Management",
  },
  description:
    "Track your Pakistan Stock Exchange (PSX) portfolio with real-time prices, market analytics, and comprehensive investment insights.",
  metadataBase: new URL("https://example.com"),
  icons: {
    icon: [
      { url: process.env.NODE_ENV == 'development' ? '/icon-grey.svg' : '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}>
        <AuthProvider>
          <AutoRefreshProvider>
            {children}
          </AutoRefreshProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
