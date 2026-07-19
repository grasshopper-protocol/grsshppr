# Human-AI Collaboration

Grasshopper is built through a collaboration between humans and AI. This document explains how we work together, what each brings to the table, and why transparency matters.

## The Model

### Humans Bring
- **Vision & Purpose** — Why Grasshopper should exist, what problems it solves, who it serves
- **Design Judgment** — What feels right, what's too heavy, what earns its place
- **User Empathy** — Real mentoring experiences, user needs, edge cases from the field
- **Strategic Decisions** — Feature prioritization, roadmap direction, scope boundaries

### AI (Claude) Brings
- **Architecture Patterns** — Next.js best practices, database schema design, type safety
- **Implementation Speed** — Turning natural language specs into working code
- **Consistency** — Remembering past decisions, maintaining patterns across the codebase
- **Documentation** — Auto-generating ADRs, updating engineering docs, maintaining traceability

### We Build Together
This isn't delegation. It's co-design:

1. **Human** sketches a feature in natural language
   > "Mentees should be able to set goals and link sessions to those goals"

2. **AI** proposes schema, shows tradeoffs, asks clarifying questions
   > "Should goals be required or optional? Core feature or module?"

3. **Human** refines based on user needs
   > "Goals should be opt-in modules — not every mentoring relationship needs structured tracking"

4. **AI** implements, documents the decision (ADR), updates architecture docs

5. **Human** validates the implementation, tests the UX, gives feedback

6. **Repeat** — tight loops, continuous refinement

## Why Transparency Matters

We document this collaboration model because:

- **Honesty:** Users and contributors deserve to know how Grasshopper is built
- **Learning:** Other projects can learn from (or improve upon) this approach
- **Accountability:** Humans own the decisions; AI amplifies execution
- **Evolution:** As AI capabilities change, this model will evolve — we'll document that too

## What This Looks Like in Practice

### Commits
Every commit where AI contributed meaningfully includes:
```
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Decision-Making
- **Product decisions** (what to build, who it's for) — Human-led
- **Architecture decisions** (ADRs) — Collaborative, human-approved
- **Implementation details** (code patterns, file structure) — AI-led, human-reviewed

### Code Review
- All code is reviewed, regardless of author (human or AI)
- Tests, type safety, and security checks apply equally
- The CI pipeline doesn't care who wrote it — only that it works

## The Augmented Human Thesis

This collaboration model reflects a belief: **AI should amplify human judgment, not replace it.**

- Humans decide *why* something should exist
- AI helps make it *real*
- Together, we ship faster without losing intentionality

Grasshopper is proof that this works. The code is public. The decisions are documented. The results speak for themselves.

---

**Questions about this model?** Open a [Discussion](https://github.com/grasshopper-protocol/grsshppr/discussions) — we're happy to explain our thinking.
