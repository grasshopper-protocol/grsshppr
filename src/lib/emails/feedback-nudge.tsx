import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
  Link,
} from "@react-email/components";

// Logo is a static brand asset — always load it from the canonical public
// origin so it resolves in every environment. It is intentionally NOT tied to
// BETTER_AUTH_URL (which is localhost in dev): a real inbox can't reach
// localhost, and Gmail/Outlook block data-URI (base64) images, so neither
// localhost nor inline embedding works. Override with EMAIL_LOGO_URL if needed.
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? "https://www.grsshppr.org/logo.png";

export function FeedbackNudgeEmail({
  recipientName,
  partnerName,
  sessionDate,
  dashboardUrl,
}: {
  recipientName: string;
  partnerName: string;
  sessionDate: string;
  dashboardUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#fafafa" }}>
        <Container style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px" }}>
          {/* Raster PNG on the canonical origin — email clients (Gmail, Outlook, Apple Mail) don't render SVG or data-URI images. */}
          <Img
            src={LOGO_URL}
            alt="Grsshppr"
            width={28}
            height={28}
            style={{ marginBottom: 24 }}
          />
          <Heading as="h2" style={{ fontSize: 20 }}>How did it go?</Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            Your session with <strong>{partnerName}</strong> on {sessionDate} recently
            completed. We&apos;d love to hear how it went — it only takes a few seconds.
          </Text>
          <Section style={{ marginTop: 16 }}>
            <Link
              href={dashboardUrl}
              style={{
                backgroundColor: "#171717",
                color: "#fafafa",
                padding: "10px 20px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Leave feedback
            </Link>
          </Section>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e5e5" }} />
          <Text style={{ fontSize: 12, color: "#737373" }}>
            Grsshppr — Free mentoring for tech & design professionals
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
