import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { IntlProvider } from "@/components/providers/IntlProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f1729",
};

export const metadata: Metadata = {
  title: "TalkTrack",
  description: "Voice-first rehearsal coach for presentations, speeches, and pitches",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TalkTrack",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-dvh flex flex-col bg-bg text-text">
        <IntlProvider>{children}</IntlProvider>
      </body>
    </html>
  );
}
