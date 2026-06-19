import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, profiles } from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const seedMentors = [
  {
    name: "Elena Vasquez",
    email: "elena@example.com",
    bio: "Staff designer at a fintech startup. Previously at Shopify. I focus on design systems, accessibility, and mentoring early-career designers.",
    expertise: ["design systems", "accessibility", "figma", "ui design"],
    experienceYears: 12,
  },
  {
    name: "James Okafor",
    email: "james@example.com",
    bio: "Senior frontend engineer. I love TypeScript, React, and helping people write cleaner code. Let's pair-program.",
    expertise: ["react", "typescript", "next.js", "testing"],
    experienceYears: 8,
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    bio: "Engineering manager at a Series B company. Happy to chat about career transitions, tech leadership, or system design.",
    expertise: ["engineering management", "system design", "career growth", "leadership"],
    experienceYears: 15,
  },
  {
    name: "Marcus Chen",
    email: "marcus@example.com",
    bio: "Product designer specializing in B2B SaaS. I've shipped products used by thousands of teams. UX research enthusiast.",
    expertise: ["product design", "ux research", "b2b saas", "prototyping"],
    experienceYears: 7,
  },
  {
    name: "Sara Kim",
    email: "sara@example.com",
    bio: "Full-stack developer and open-source contributor. Passionate about developer experience and clean APIs.",
    expertise: ["node.js", "postgresql", "api design", "open source"],
    experienceYears: 6,
  },
  {
    name: "David Abramov",
    email: "david@example.com",
    bio: "UX writer and content strategist. I help teams write interface copy that's clear, inclusive, and human.",
    expertise: ["ux writing", "content strategy", "microcopy", "information architecture"],
    experienceYears: 9,
  },
];

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed script cannot run in production.");
    process.exit(1);
  }

  console.log("Seeding database…");

  for (const mentor of seedMentors) {
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      name: mentor.name,
      email: mentor.email,
      emailVerified: true,
    });

    await db.insert(profiles).values({
      id: profileId,
      userId,
      role: "mentor",
      bio: mentor.bio,
      expertise: mentor.expertise,
      experienceYears: mentor.experienceYears,
      available: true,
    });

    console.log(`  ✓ ${mentor.name}`);
  }

  console.log(`\nSeeded ${seedMentors.length} mentors.`);
  await client.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await client.end();
  process.exit(1);
});
