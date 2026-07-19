import { createHmac } from "crypto";

const SECRET = process.env.BETTER_AUTH_SECRET!;
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TokenPayload {
  sessionId: string;
  action: "confirm" | "cancel";
  exp: number;
}

export function signEmailAction(sessionId: string, action: "confirm" | "cancel"): string {
  const payload: TokenPayload = {
    sessionId,
    action,
    exp: Date.now() + EXPIRY_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyEmailAction(token: string): TokenPayload | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expectedSig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as TokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
