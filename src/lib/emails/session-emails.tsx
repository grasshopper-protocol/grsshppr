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
  Button,
} from "@react-email/components";

// Logo is a static brand asset — always load it from the canonical public
// origin so it resolves in every environment. It is intentionally NOT tied to
// BETTER_AUTH_URL (which is localhost in dev): a real inbox can't reach
// localhost, and Gmail/Outlook block data-URI (base64) images, so neither
// localhost nor inline embedding works. Override with EMAIL_LOGO_URL if needed.
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? "https://www.grsshppr.org/logo.png";

interface SessionEmailProps {
  mentorName: string;
  menteeName: string;
  startsAt: string; // ISO string
  endsAt: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function Layout({ children }: { children: React.ReactNode }) {
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
          {children}
          <Hr style={{ margin: "24px 0", borderColor: "#e5e5e5" }} />
          <Text style={{ fontSize: 12, color: "#737373" }}>
            Grsshppr — Free mentoring for tech & design professionals
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Mentor receives: new session request
export function SessionRequestedEmail({
  mentorName,
  menteeName,
  startsAt,
  confirmUrl,
  declineUrl,
  goalTitles,
}: SessionEmailProps & {
  confirmUrl?: string;
  declineUrl?: string;
  goalTitles?: string[];
}) {
  return (
    <Layout>
      <Heading as="h2" style={{ fontSize: 20 }}>New session request</Heading>
      <Text>Hi {mentorName},</Text>
      <Text>
        <strong>{menteeName}</strong> has requested a mentoring session on{" "}
        <strong>{formatDateTime(startsAt)}</strong>.
      </Text>
      {goalTitles && goalTitles.length > 0 && (
        <Section style={{ margin: "16px 0", padding: "12px 16px", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <Text style={{ fontSize: 13, margin: 0, color: "#525252" }}>
            <strong>Goals they'd like help with:</strong>
          </Text>
          {goalTitles.map((title, i) => (
            <Text key={i} style={{ fontSize: 13, margin: "4px 0 0 0", color: "#525252" }}>
              • {title}
            </Text>
          ))}
        </Section>
      )}
      {confirmUrl && declineUrl ? (
        <Section style={{ margin: "20px 0" }}>
          <Button
            href={confirmUrl}
            style={{
              backgroundColor: "#171717",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              marginRight: 8,
            }}
          >
            Confirm
          </Button>
          <Button
            href={declineUrl}
            style={{
              backgroundColor: "#fff",
              color: "#171717",
              padding: "10px 20px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #e5e5e5",
            }}
          >
            Decline
          </Button>
        </Section>
      ) : (
        <Text>Head to your dashboard to confirm or decline.</Text>
      )}
    </Layout>
  );
}

// Mentee receives: session confirmed
export function SessionConfirmedEmail({ mentorName, menteeName, startsAt }: SessionEmailProps) {
  return (
    <Layout>
      <Heading as="h2" style={{ fontSize: 20 }}>Session confirmed</Heading>
      <Text>Hi {menteeName},</Text>
      <Text>
        <strong>{mentorName}</strong> confirmed your session on{" "}
        <strong>{formatDateTime(startsAt)}</strong>.
      </Text>
      <Text>You can add it to your calendar from the session page.</Text>
    </Layout>
  );
}

// Both receive: session cancelled
export function SessionCancelledEmail({
  recipientName,
  cancelledByName,
  startsAt,
}: {
  recipientName: string;
  cancelledByName: string;
  startsAt: string;
}) {
  return (
    <Layout>
      <Heading as="h2" style={{ fontSize: 20 }}>Session cancelled</Heading>
      <Text>Hi {recipientName},</Text>
      <Text>
        <strong>{cancelledByName}</strong> cancelled the session scheduled for{" "}
        <strong>{formatDateTime(startsAt)}</strong>.
      </Text>
    </Layout>
  );
}
