# Google OAuth verification: Google Calendar sync

How the hosted Grsshppr gets Google's approval for Google Calendar sync
([RFC-0012](rfc/RFC-0012-calendar-integration.md)). Self-hosters who offer
calendar sync to the public need the same approval for their own OAuth app.

**Why it's needed.** We request `calendar.events.owned`, a *sensitive* scope.
Until Google verifies the app, only accounts on its test-user list can connect
(Testing mode), or everyone sees an "unverified app" warning with a 100-user cap.
Sensitive scopes need no paid security assessment; that applies only to
*restricted* scopes.

**Scopes, exactly:** `openid`, `email`,
`https://www.googleapis.com/auth/calendar.events.owned`. The consent screen's
list must match what the app requests.

---

## 1. Before submitting

- [x] The flow works on production, behind `CALENDAR_SYNC_ALLOWED_USERS`
      (soak tested 2026-10-29).
- [x] The homepage explains what we do with Google Calendar data and links to
      the Privacy Policy ("Sessions in your calendar").
- [ ] The Privacy Policy and Terms have been reviewed by a lawyer. Google reviews
      the policy, so it must be final.
- [ ] `grsshppr.org` is verified in Google Search Console by an owner of the
      Cloud project.

## 2. Google Cloud console

**Branding**
- App name **Grsshppr**, matching the homepage. Logo: the Grsshppr mark,
  120×120 PNG (a logo triggers brand verification, which is expected).
- User support email and developer contact.
- Home page `https://www.grsshppr.org`, Privacy Policy
  `https://www.grsshppr.org/privacy-policy`, Terms
  `https://www.grsshppr.org/terms-of-service`.
- Authorised domain `grsshppr.org`.

**Clients.** Redirect URI
`https://www.grsshppr.org/api/calendar/callback/google`, plus
`http://localhost:3000/api/calendar/callback/google` for development.

**Data access.** Exactly the three scopes above, with the justification in §3
and the demo video from §4.

**Audience.** Stay in **Testing** while waiting. To submit: **Publish app**, then
**Prepare for verification**. While in Testing mode, keep
`CALENDAR_SYNC_ALLOWED_USERS` set, so only test users see **Connect**.

## 3. Scope justification (paste into the console)

> Grsshppr is a free, open-source mentoring platform. When a mentor confirms a
> 1:1 session, a participant who has connected Google Calendar gets that
> session as an event in their own calendar: created on confirmation, updated
> if it changes, and deleted if it's cancelled. The event includes a Google
> Meet link for the session.
>
> We request `calendar.events.owned` because we only create, update and delete
> the events Grsshppr itself makes, on the user's own primary calendar. We
> don't need to read, list or change any other event, and we don't access
> calendars the user doesn't own, so the broader `calendar.events` and
> `calendar` scopes would grant more than we use. We write to the primary
> calendar, not a separate one, because the point of the feature is that a
> booked session blocks the person's real schedule and uses their usual
> reminders.
>
> Events are private, list no attendees and contain no email addresses, goals
> or notes. Tokens are encrypted at rest. Users can disconnect at any time in
> Settings, which removes their upcoming session events and revokes our access;
> deleting the account does the same. We don't use Google user data for
> advertising, don't sell it and don't use it to train AI models (see the
> Privacy Policy, Limited Use section).

`openid` and `email` show the user which Google account is connected.

Likely question: "Would a narrower option, such as a secondary calendar created
by the app, be enough?" The answer is in the "primary calendar" sentence above:
sessions must block the person's real schedule.

## 4. Demo video (2–4 minutes, English, YouTube unlisted)

Record on production with an allow-listed account. Keep the browser's address
bar visible throughout.

1. **Homepage:** scroll to "Sessions in your calendar"; show the Privacy
   Policy link.
2. **Sign in** to Grsshppr.
3. **Settings → Calendar → Connect Google Calendar.**
4. **Google's consent screen:** pause. Show the app name **Grsshppr**, zoom on
   the address bar showing `client_id=` (Google requires the client ID to be
   visible), and show the requested permission. Continue.
5. **Back in Settings:** "Connected as …".
6. **Create:** as the mentor, confirm a requested session. Switch to Google
   Calendar: the private event "Grsshppr session with …" appears with a Meet
   link. Open it to show there are no attendees.
7. **Join:** back on the session page, show **Join video call**.
8. **Delete:** cancel the session; the event disappears from Google Calendar.
9. **Revoke:** Settings → **Disconnect**, then show Grsshppr gone from
   myaccount.google.com → Third-party connections.

You need two accounts (a connected mentor and a mentee) and a requested session
at least two days ahead.

## 5. After submitting

- Google may email questions; reply in the same thread.
- Brand verification usually takes a few days; sensitive-scope review takes
  longer.
- Testers in Testing mode must reconnect every 7 days until approval.
- **On approval:** unset `CALENDAR_SYNC_ALLOWED_USERS` and redeploy, record
  Phase 1's outcome in RFC-0012, and update the roadmap.
