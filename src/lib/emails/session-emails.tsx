import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from "@react-email/components";

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
          {children}
          <Hr style={{ margin: "24px 0", borderColor: "#e5e5e5" }} />
          <Text style={{ fontSize: 12, color: "#737373" }}>
            Grasshopper — Free mentoring for tech & design professionals
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Mentor receives: new session request
export function SessionRequestedEmail({ mentorName, menteeName, startsAt }: SessionEmailProps) {
  return (
    <Layout>
      <Heading as="h2" style={{ fontSize: 20 }}>New session request</Heading>
      <Text>Hi {mentorName},</Text>
      <Text>
        <strong>{menteeName}</strong> has requested a mentoring session on{" "}
        <strong>{formatDateTime(startsAt)}</strong>.
      </Text>
      <Text>Head to your dashboard to confirm or decline.</Text>
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
