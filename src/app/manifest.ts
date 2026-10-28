import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IFGF Rides",
    short_name: "IFGF Rides",
    description: "Find a ride to Sunday service at IFGF Bay Area, or offer one.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#111111",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
