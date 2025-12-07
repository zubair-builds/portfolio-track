import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import AuthProvider from "../components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pakistan Stocks — Live Prices & Market Overview",
  description:
    "Plain-language view of the Pakistan Stock Exchange (PSX) with live prices, symbols, and key market stats for everyone.",
  metadataBase: new URL("https://example.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const root = document.documentElement;
                  
                  // Remove any existing dark class first
                  root.classList.remove('dark');
                  
                  // Only add dark class if explicitly saved as dark
                  if (theme === 'dark') {
                    root.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 h-full`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
