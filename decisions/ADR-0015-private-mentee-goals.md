# ADR-0015: Mentee goals are private on public mentor profiles

- **Status:** Accepted
- **Date:** 2026-10-25
- **Discipline:** Product
- **Source RFC:** none — direct (privacy fix). Supersedes the 2026-06-22
  "Impact section on mentor profile" entry in [LOG.md](LOG.md).

## Context

On 2026-06-22 we added an *Impact* section to mentor profiles listing every
completed goal attributed to the mentor, with the goal's **title**, the
**mentee's name** and the month it was achieved. The rationale was trust:
outcomes show a mentor's value.

Mentor profiles (`/mentor/[slug]`) are public, need no sign-in, and are listed
in the sitemap, so search engines index them. That made mentees' names and goal
titles public, permanently cacheable data. Mentees never opted in: a mentor
chooses to publish a profile, their mentees don't. Goal titles can be personal
("Get promoted before my parental leave", "Leave my current employer"). The
original decision weighed the mentor's credibility and never the mentee's
consent.

This surfaced while writing the Privacy Policy, which would otherwise have had
to disclose it as public data.

## Options

**A. Keep the list, disclose it in the Privacy Policy.** Pro: no change.
Con: disclosure isn't consent; it exposes people who have no say in it.
Rejected.

**B. Show the list only to signed-in users.** Pro: keeps the detail.
Con: anyone can sign up, so it's still effectively public, just not indexed.
Rejected.

**C. Per-goal opt-in by the mentee.** Pro: keeps detail where the mentee wants
it. Con: new consent UI and data model for a feature nobody has asked for;
default would still need to be private. Deferred — revisit if mentees ask to
showcase achievements.

**D. Anonymous count only (chosen).** "12 mentee goals achieved". Pro: keeps the
trust signal, exposes nothing about any mentee, no new UI or schema. Con: less
vivid than named outcomes.

## Decision

Adopt **D**. A public mentor profile shows only the **number** of completed
goals attributed to that mentor. Goal titles, descriptions, dates and mentee
identities are never sent to a public page: the query returns a count, so the
data doesn't reach the HTML, page source or caches.

Standing rule: **a mentee's goals are the mentee's data.** Showing any of them
outside the mentoring pair requires the mentee's explicit opt-in and a new ADR.

## Consequences

- **Easier:** the Privacy Policy can say no mentee data is public.
- **Harder:** mentors lose named outcomes on their profile. If that matters,
  option C is the path, opt-in only.
- **Not fixed by this change:** pages already crawled may keep the old content
  in search caches until they're re-crawled. The sitemap prompts a re-crawl;
  no further action planned.
- Signed-in mentees still see their *own* active goals matched against a
  mentor's expertise on that mentor's page — visible only to themselves.

## Links

- Superseded log entry: [LOG.md](LOG.md) (2026-06-22, Impact section)
- Related: Privacy Policy (`/privacy-policy`)
- Implementation PR: _to be linked_
