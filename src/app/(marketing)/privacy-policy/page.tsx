import type { Metadata } from "next";
import {
  ContactLink,
  InlineLink,
  LEGAL_OPERATOR,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data Grsshppr collects, why, who processes it, and your rights.",
  alternates: { canonical: "/privacy-policy" },
};

const REPO = "https://github.com/grasshopper-protocol/grsshppr";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="25 October 2026">
      <p>
        Grsshppr (&ldquo;Grsshppr&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a free, open-source
        mentoring platform at grsshppr.org. This policy explains what personal data we collect, why,
        who processes it on our behalf, how long we keep it, and the rights you have. Grsshppr is
        open source, so you can also{" "}
        <InlineLink href={REPO}>read the code</InlineLink> that handles your data.
      </p>

      <LegalSection title="Who we are">
        <p>
          Grsshppr is operated by <strong className="text-foreground">{LEGAL_OPERATOR}</strong>, an
          individual based in Singapore, who is responsible for your personal data (the data
          controller) and acts as the contact for data protection matters. Contact:{" "}
          <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <LegalList>
          <li>
            <strong className="text-foreground">Account details</strong> from the sign-in provider
            you choose (Google or GitHub): your name, email address and profile picture. If you add a
            passkey, we store only its public key and technical details about it — never your
            biometrics or device secrets.
          </li>
          <li>
            <strong className="text-foreground">Sign-in records</strong>: the session that keeps you
            signed in, with the IP address and browser user agent it was created from, and the tokens
            your sign-in provider issues to us.
          </li>
          <li>
            <strong className="text-foreground">Your profile</strong>: role (mentor or mentee),
            headline, bio, areas of expertise, years of experience, links you add and, for mentors,
            weekly availability and time zone.
          </li>
          <li>
            <strong className="text-foreground">Mentoring activity</strong>: session requests and
            bookings (times, status, cancellation reasons), shared session notes, goals and their
            progress, feedback ratings and comments, and in-app notifications.
          </li>
          <li>
            <strong className="text-foreground">Emails we send you</strong> about your sessions, such
            as requests, confirmations and cancellations.
          </li>
        </LegalList>
        <p>
          We do <strong className="text-foreground">not</strong> use analytics, advertising or
          tracking cookies, and we do not sell or rent personal data.
        </p>
      </LegalSection>

      <LegalSection title="Why we use it">
        <LegalList>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To show profiles, match mentors and mentees, and book and manage sessions.</li>
          <li>To send you emails and notifications about your sessions.</li>
          <li>To keep the service safe, prevent abuse and fix problems.</li>
        </LegalList>
        <p>
          We use your data only for these purposes. If you are in the EU or UK, our legal bases are
          performing our agreement with you (providing the service), our legitimate interest in
          keeping it secure, and your consent where we ask for it (for example, connecting a
          calendar).
        </p>
      </LegalSection>

      <LegalSection title="What other people can see">
        <LegalList>
          <li>
            <strong className="text-foreground">Mentor profiles are public.</strong> A mentor&apos;s
            name, picture, headline, bio, expertise, links and whether they are taking new mentees can
            be seen by anyone, including search engines.
          </li>
          <li>
            <strong className="text-foreground">Mentee goals stay private.</strong> A mentor&apos;s
            public profile shows only <em>how many</em> mentee goals they have helped achieve —
            never a goal&apos;s title or who it belongs to. Mentee profiles are not public.
          </li>
          <li>
            The people you have sessions with can see your name and picture, the session details,
            shared notes, and goals linked to your sessions.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Who processes your data">
        <p>We use a small number of service providers to run Grsshppr:</p>
        <LegalList>
          <li>
            <strong className="text-foreground">Vercel</strong> — hosting the website and keeping
            short-lived operational logs.
          </li>
          <li>
            <strong className="text-foreground">Neon</strong> — hosting the database.
          </li>
          <li>
            <strong className="text-foreground">Resend</strong> — sending emails.
          </li>
          <li>
            <strong className="text-foreground">Google and GitHub</strong> — signing you in, if you
            choose them. Their own privacy policies apply to your accounts with them.
          </li>
        </LegalList>
        <p>
          These providers may process data outside Singapore, including in the United States. Where
          they do, we rely on their contractual commitments to protect it to a standard comparable
          to Singapore&apos;s Personal Data Protection Act.
        </p>
      </LegalSection>

      <LegalSection title="Google user data">
        <p>
          If you sign in with Google, we receive your name, email address and profile picture, and
          use them only to create and identify your account.
        </p>
        <p>
          When Google Calendar integration becomes available and you choose to connect your
          calendar, Grsshppr will only create, update and delete the events for your Grsshppr
          sessions on your own calendar. Those events carry no other participant&apos;s contact
          details. We do not read your other events, and you can disconnect at any time, which
          revokes our access.
        </p>
        <p>
          Grsshppr&apos;s use and transfer of information received from Google APIs to any other app
          will adhere to the{" "}
          <InlineLink href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </InlineLink>
          , including the Limited Use requirements. We do not use Google user data for advertising,
          do not sell it, and do not use it to train AI models.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          We use one strictly necessary cookie to keep you signed in. Your browser&apos;s local
          storage remembers small preferences, such as light or dark mode and dismissed prompts.
          None of these track you across other sites.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your data while your account exists. When you delete your account, we delete your
          profile, availability, goals, notifications, sign-in records and passkeys. Sessions you
          took part in are also deleted, including their notes and feedback, so they disappear from
          the other participant&apos;s history too. Copies may persist in encrypted backups and
          provider logs for a short period before they are overwritten.
        </p>
      </LegalSection>

      <LegalSection title="How we protect it">
        <p>
          Data is encrypted in transit, access is limited to what is needed to run the service, and
          the code is public for anyone to review. No system is perfectly secure; if a breach affects
          your data, we will notify you and the relevant authorities where the law requires it.
          Please report security issues as described in our{" "}
          <InlineLink href={`${REPO}/blob/main/SECURITY.md`}>security policy</InlineLink>.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under Singapore&apos;s Personal Data Protection Act, you can ask to access your personal
          data, ask us to correct it, and withdraw your consent (which may mean we can no longer
          provide the service to you). If you are in the EU or UK, you also have the right to
          erasure, to restrict or object to processing, to data portability, and to complain to your
          local data protection authority.
        </p>
        <p>
          You can edit your profile and delete your account yourself in Settings. For anything else,
          email <ContactLink />. We will respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="Age">
        <p>
          Grsshppr is for people aged 18 and over. We do not knowingly collect data from anyone
          younger; if you believe we have, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We will post any changes on this page and update the date above. For significant changes,
          we will also let you know by email or in the app. Earlier versions are in the{" "}
          <InlineLink href={`${REPO}/commits/main/src/app/(marketing)/privacy-policy/page.tsx`}>
            public history of this page
          </InlineLink>
          .
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions or requests about your data: <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
