import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PawSafe Plants",
  description: "Identify a houseplant and check if it is safe for cats",
  applicationName: "PawSafe Plants",
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png", // iPhone home-screen icon
  },
  // iPhone: open full-screen from the home screen, with this name under the icon
  appleWebApp: { capable: true, title: "PawSafe", statusBarStyle: "default" },
};

// Colours the phone's status bar / browser chrome to match the page in light and dark mode
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#121812" },
  ],
  viewportFit: "cover", // lets the app use the full screen; the menu button respects the safe areas
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
