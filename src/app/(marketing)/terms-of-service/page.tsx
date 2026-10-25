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
  title: "Terms of Service",
  description: "The terms for using Grsshppr, the free, open-source mentoring platform.",
  alternates: { canonical: "/terms-of-service" },
};

const REPO = "https://github.com/grasshopper-protocol/grsshppr";

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="25 October 2026">
      <p>
        These terms apply to your use of Grsshppr at grsshppr.org (&ldquo;the service&rdquo;),
        operated by <strong className="text-foreground">{LEGAL_OPERATOR}</strong> in Singapore
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the service, you agree
        to them. Our <InlineLink href="/privacy-policy">Privacy Policy</InlineLink> explains how we
        handle your data.
      </p>

      <LegalSection title="The service">
        <p>
          Grsshppr connects people who want mentoring in tech and design with volunteers who offer
          it. It is free to use. We may change, pause or stop any part of it, and we will give
          reasonable notice where we can.
        </p>
      </LegalSection>

      <LegalSection title="Who can use it">
        <LegalList>
          <li>You must be 18 or older.</li>
          <li>
            You must sign in with your own Google or GitHub account, or a passkey, and keep access
            to it secure. You are responsible for what happens under your account.
          </li>
          <li>The information in your profile must be accurate and about you.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="How to behave">
        <p>
          Everyone using Grsshppr must follow our{" "}
          <InlineLink href={`${REPO}/blob/main/CODE_OF_CONDUCT.md`}>Code of Conduct</InlineLink>. In
          particular, you must not:
        </p>
        <LegalList>
          <li>harass, threaten, discriminate against or exploit anyone;</li>
          <li>use the service to sell products or services, recruit, or send unsolicited messages;</li>
          <li>impersonate anyone or misrepresent your experience;</li>
          <li>share other people&apos;s personal data without their permission;</li>
          <li>post anything unlawful, or that infringes someone else&apos;s rights;</li>
          <li>
            attempt to disrupt, overload or gain unauthorised access to the service. Security
            research is welcome under our{" "}
            <InlineLink href={`${REPO}/blob/main/SECURITY.md`}>security policy</InlineLink>.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Mentoring is voluntary advice">
        <p>
          Mentors are volunteers sharing their own experience. Their guidance is not professional,
          legal, financial, medical or career-placement advice, and we do not vet, employ or endorse
          them. Use your own judgement, and take care before sharing sensitive information in a
          session. We are not responsible for what users say or do, in or outside the service.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You own what you add to Grsshppr — your profile, notes, goals and feedback. You give us
          permission to store, display and process it only as needed to run the service, including
          showing mentor profiles publicly as described in the Privacy Policy. This permission ends
          when you delete the content or your account, except for copies in backups that expire
          shortly afterwards.
        </p>
      </LegalSection>

      <LegalSection title="Open-source code">
        <p>
          The Grsshppr source code is published under the{" "}
          <InlineLink href={`${REPO}/blob/main/LICENSE`}>MIT License</InlineLink>. These terms
          govern your use of the hosted service at grsshppr.org, not the code. If you run your own
          copy, you are its operator and responsible for it.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          Signing in with Google or GitHub, and any calendar or video-call service you connect, are
          provided by those companies under their own terms. We are not responsible for them.
        </p>
      </LegalSection>

      <LegalSection title="Suspension and ending your account">
        <p>
          You can delete your account at any time in Settings. We may suspend or remove accounts or
          content that break these terms or put others at risk, and will tell you why unless doing
          so would be unsafe or unlawful.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          The service is provided free, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the
          extent the law allows, we make no promises that it will be uninterrupted, error-free or
          fit for a particular purpose.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the extent the law allows, we are not liable for any indirect or consequential loss, or
          for any loss arising from interactions between users. Our total liability to you for any
          claim relating to the service is limited to SGD 100. Nothing in these terms limits
          liability that cannot be limited by law, such as for death or personal injury caused by
          negligence, or for fraud.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We will post changes on this page and update the date above, and let you know in advance
          of significant changes. If you keep using the service after a change takes effect, the
          new terms apply. Earlier versions are in the{" "}
          <InlineLink href={`${REPO}/commits/main/src/app/(marketing)/terms-of-service/page.tsx`}>
            public history of this page
          </InlineLink>
          .
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of Singapore, and the courts of Singapore have
          jurisdiction over any dispute. If you live in a country whose consumer laws give you rights
          that cannot be waived, these terms do not take them away.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms: <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
