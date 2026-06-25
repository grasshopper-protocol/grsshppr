import type { MetadataRoute } from "next";

// Canonical origin — matches metadataBase in layout.tsx.
const baseUrl = process.env.BETTER_AUTH_URL || "https://www.grsshppr.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authed / personal surfaces (see proxy.ts protectedPaths) — keep out of the index.
      disallow: [
        "/dashboard",
        "/explore",
        "/session",
        "/settings",
        "/profile",
        "/welcome",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
