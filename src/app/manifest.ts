import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Win Concept",
    short_name: "WinConcept",
    description: "NLCB Online Gaming Analytical System",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0C0E",
    theme_color: "#0B0C0E",
    icons: [
      {
        src: "/images/pwa-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/pwa-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
