# Decision Log (historical)

Migrated from `AGENTS.md`. These are decisions made before the ADR process
existed. New decisions get a dedicated [ADR](README.md) file.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-18 | Modular architecture (core + opt-in modules) | Keep v1 simple; reward committed pairs with depth — see [ADR-0001](ADR-0001-modular-architecture.md) |
| 2026-06-18 | Free/volunteer model | Reduce barriers; differentiate from MentorCruise/GrowthMentor |
| 2026-06-18 | Tech & Design focus | Clear audience; avoid "platform for everything" trap |
| 2026-06-18 | 3 core features only | Purposeful constraint; each feature must justify its existence |
| 2026-06-18 | Next.js 16 + Tailwind + Drizzle + Better Auth | Modern, type-safe, OSS-friendly, self-hostable |
| 2026-06-18 | PostgreSQL (Docker local, Neon prod) | No vendor lock. Contributors run `docker compose up` |
| 2026-06-18 | Phosphor Icons | Mono-weight, multiple weights available, React-native tree-shaking |
| 2026-06-19 | Passwordless auth only (OAuth + passkeys) | No passwords = no resets, no credential stuffing — see [ADR-0002](ADR-0002-passwordless-auth.md) |
| 2026-06-19 | Better Auth passkey plugin (`@simplewebauthn`) | WebAuthn, rpName: "Grasshopper" |
| 2026-06-22 | Availability-based booking (not free-form) | Mentors define weekly windows; mentees pick generated slots |
| 2026-06-22 | Goals v2: mentor attribution + target dates | `mentorId` FK on goals; server-validates against session history |
| 2026-06-22 | Explicit goal status actions (not cycling) | Complete/Pause/Resume/Reopen buttons; clearer UX |
| 2026-06-22 | Profile `headline` field (max 100 chars) | One flexible credibility signal — not separate jobTitle+company |
| 2026-06-22 | Profile `links[]` (up to 5 URLs) | LinkedIn, GitHub, portfolio; auto-detected icons on mentor page |
| 2026-06-22 | Mentor profile: two-column, sticky booking sidebar | Left: identity→expertise→links→about→stats→impact. Right: book CTA |
| 2026-06-22 | Impact section on mentor profile | Completed goals attributed to mentor; builds trust via outcomes |
| 2026-06-22 | Contextual avatar sizing | h-8 menu → h-11 dashboard → h-14 explore → h-16 session → h-28/32 hero |
