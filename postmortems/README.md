# Post-mortems

Honest write-ups of production incidents. Open by default: we publish what broke,
why, and what changed — so the next person (or agent) doesn't rediscover it the
hard way.

Each post-mortem is blameless and follows the same shape: what happened, impact,
root cause, the fix, and the durable lesson (usually an ADR or a rule).

## Index

| Date | Incident | Resulting decision |
|------|----------|--------------------|
| [2026-06-23](2026-06-23-booking-timezone.md) | Booking failed / wrong-day slots across timezones | [ADR-0004](../decisions/ADR-0004-timezone-handling.md) |
| [2026-06-23](2026-06-23-profiles-slug-drift.md) | Prod 500s: `column profiles.slug does not exist` | [ADR-0003](../decisions/ADR-0003-schema-migrations.md) |
