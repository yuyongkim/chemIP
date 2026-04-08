import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChemIP Platform",
  description: "Integrated MSDS, drug, and market intelligence lookup platform",
  icons: {
    icon: "/beaker-favicon.svg",
    shortcut: "/beaker-favicon.svg",
    apple: "/beaker-favicon.svg",
  },
  other: {
    "theme-color": "#2563eb",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
