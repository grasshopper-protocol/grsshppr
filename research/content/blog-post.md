# Building Grasshopper: What Happens When You Give an Augmented Designer a Weekend and Claude

## Opening Hook

I've been writing about augmented designers for two years. Designers who use AI to amplify their work, not replace it. But I'd been *talking* about it more than *doing* it.

Then I spent a weekend building Grasshopper with Claude, and everything I'd theorized about human-AI collaboration became concrete.

## The Problem (Personal Stakes)

Mentoring platforms are broken. ADPList has 38,000+ mentors—overwhelming. MentorCruise charges $150–360/month. Most platforms treat mentoring as transactional: one call, no follow-up, no continuity.

I've mentored dozens of designers through ADPList. Every time, I wished for something simpler: a platform that felt purposeful, where sessions built on each other, where the relationship mattered more than the marketplace.

So I decided to build it. Free. Open-source. Minimal.

## The Collaboration Model

Here's what working with Claude looked like:

**I brought:**
- Product vision (what should exist)
- Design decisions (what feels right)
- User empathy (what mentors/mentees actually need)

**Claude brought:**
- Architecture patterns (Next.js 16 app router, Drizzle ORM)
- Implementation speed (schema → working feature in minutes)
- Memory across sessions (recalled past decisions, avoided contradictions)

**We built together:**
- I'd sketch a feature in natural language: "Mentees should be able to set goals and link sessions to those goals."
- Claude would propose a schema, show tradeoffs, ask clarifying questions.
- I'd refine: "No, goals should be opt-in modules, not core. Not every mentoring relationship needs structured tracking."
- Claude would refactor, update the architecture docs (ENGINEERING.md), and write the ADR explaining *why*.

## What Surprised Me

### Speed isn't the win. Continuity is.

I didn't gain velocity because Claude typed faster. I gained it because Claude *remembered*. Every conversation built on the last. Design decisions from Tuesday informed Friday's feature work. Nothing was re-litigated.

### The work felt like co-design, not delegation.

I wasn't prompting a tool. I was collaborating with a partner who had context. When I said "this feels too heavy," Claude understood I meant *cognitively heavy for users*, not *technically complex*.

### Claude made me a better architect.

By forcing me to articulate *why* a feature should exist, Claude surfaced my own assumptions. When I couldn't explain why something mattered, it usually didn't.

## The Augmented Designer Thesis, Realized

This is what I meant when I wrote about augmented humans:

- **AI amplifies judgment, not just execution.** Claude didn't replace my design thinking—it made my instincts actionable.
- **Collaboration beats automation.** The best outcomes came from tight loops: I'd validate, Claude would build, I'd refine.
- **Humans own the "why."** Claude never questioned whether Grasshopper *should* exist. That's my job. Its job was making it real.

## What's Next

Grasshopper is in beta. Feature-complete, hardening. We're recruiting contributors (engineers, designers, PMs) and mentors (3+ years experience, any domain).

The code is public. The roadmap is public. The decision log is public. Because if we're building a platform for mentoring in the open, the platform itself should be built in the open.

I'm calling it a "we" because that's what it is. A human-AI collaboration. And I'm genuinely excited to see where it goes.

---

## Links

- [Explore Grasshopper on GitHub](https://github.com/grasshopper-protocol/grsshppr)
- [Become a Mentor](https://www.grsshppr.org/mentors/new)
- [Read the Design Docs](https://github.com/grasshopper-protocol/grsshppr/blob/main/DESIGN.md)
- [Read About Our Human-AI Collaboration Model](https://github.com/grasshopper-protocol/grsshppr/blob/main/HUMANS.md)
