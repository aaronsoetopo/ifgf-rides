import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql ships a native binary for local SQLite files; keep it out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
