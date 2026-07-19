import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

// Canonical origin — matches metadataBase in layout.tsx.
const baseUrl = process.env.BETTER_AUTH_URL || "https://www.grsshppr.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/sign-up`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/sign-in`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Public mentor profiles (/mentor/[slug]) are the main indexable surface.
  // ponytail: degrade to static routes if the DB is unreachable at build time —
  // a sitemap must never break the build.
  let mentorRoutes: MetadataRoute.Sitemap = [];
  try {
    const mentors = await db
      .select({ slug: profiles.slug, updatedAt: profiles.updatedAt })
      .from(profiles)
      .where(eq(profiles.role, "mentor"));
    mentorRoutes = mentors.map((m) => ({
      url: `${baseUrl}/mentor/${m.slug}`,
      lastModified: m.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — ship static routes only.
  }

  return [...staticRoutes, ...mentorRoutes];
}
