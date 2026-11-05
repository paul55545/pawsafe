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
    // Android colours the installed app's status + navigation bars with theme_color, and uses
    // background_color for the launch screen. Both match the dark page (the icon is dark green too),
    // so there's no bright strip behind the gesture bar.
    background_color: "#121812",
    theme_color: "#121812",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
