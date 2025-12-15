import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import AuthProvider from "../components/AuthProvider";
import { AutoRefreshProvider } from "../components/AutoRefreshProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pakistan Stocks — Live Prices & Market Overview",
  description:
    "Plain-language view of the Pakistan Stock Exchange (PSX) with live prices, symbols, and key market stats for everyone.",
  metadataBase: new URL("https://example.com"),
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
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
