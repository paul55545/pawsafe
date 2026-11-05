// Web app manifest: tells phones this site can be installed as an app (name, icon, full-screen).
// Next.js serves it at /manifest.webmanifest and links it from every page automatically.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PawSafe Plants",
    short_name: "PawSafe",
    description: "Scan a houseplant and check whether it is safe for your cat.",
    start_url: "/",
    scope: "/",
    display: "standalone", // opens without the browser's address bar, like a native app
    orientation: "portrait",
    background_color: "#eef1ea", // splash screen while the app starts
    theme_color: "#2f5d34",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
