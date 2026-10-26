/**
 * Encryption at rest for calendar OAuth tokens (ADR-0014 decisions 5–6,
 * RFC-0012 §9). Pure: keys are passed in, never read from the environment here.
 *
 * Envelope: `<keyId>.<iv>.<tag>.<ciphertext>`, base64url parts, AES-256-GCM
 * with a random 12-byte nonce. `keyId` is the first 8 bytes (hex) of
 * sha256(key), so the right key is found without storing which one was used.
 * Additional authenticated data binds each value to its row and column, so a
 * ciphertext can't be copied into another connection or swapped between the
 * access- and refresh-token columns.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export interface TokenKeys {
  current: Buffer;
  previous?: Buffer;
}

/** Parse a base64 key from the environment; must decode to exactly 32 bytes. */
export function parseKey(base64: string | undefined): Buffer {
  const key = base64 ? Buffer.from(base64, "base64") : Buffer.alloc(0);
  if (key.length !== 32) {
    throw new Error("Calendar token key must be 32 bytes, base64-encoded (openssl rand -base64 32)");
  }
  return key;
}

export function keyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function aad(connectionId: string, column: string): Buffer {
  return Buffer.from(`${connectionId}:${column}`);
}

export function encryptToken(plaintext: string, key: Buffer, connectionId: string, column: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(connectionId, column));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [keyId(key), iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

/** The key id an envelope was encrypted with. */
export function envelopeKeyId(envelope: string): string {
  return envelope.split(".")[0];
}

/**
 * Decrypt with whichever key (current or previous) matches the envelope.
 * Throws on an unknown key, a malformed envelope, or any tampering —
 * callers treat that as "reconnect needed", never as a usable token.
 */
export function decryptToken(envelope: string, keys: TokenKeys, connectionId: string, column: string): string {
  const parts = envelope.split(".");
  if (parts.length !== 4) throw new Error("Malformed token envelope");
  const [id, iv, tag, ciphertext] = parts;
  const key = [keys.current, keys.previous].find((k) => k && keyId(k) === id);
  if (!key) throw new Error("Token was encrypted with an unknown key");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(aad(connectionId, column));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** True when an envelope should be re-encrypted with the current key (lazy rotation). */
export function needsReencryption(envelope: string, keys: TokenKeys): boolean {
  return envelopeKeyId(envelope) !== keyId(keys.current);
}
