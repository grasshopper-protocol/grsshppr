import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// ponytail: no rate limiting needed — OAuth rate-limited by providers,
// passkey by WebAuthn ceremony. Revisit if adding email/password back.
export const { GET, POST } = toNextJsHandler(auth);
