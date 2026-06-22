import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { upsertProfile, getProfileByUserId, deleteProfile } from "@/core/profiles/queries";
import { z } from "zod";
import { safeJson } from "@/lib/api-utils";

const profileSchema = z.object({
  role: z.enum(["mentor", "mentee"]),
  headline: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  expertise: z.array(z.string().max(50)).max(10).optional(),
  links: z.array(z.string().url().max(200)).max(5).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  available: z.boolean().optional(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfileByUserId(session.user.id);
  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await upsertProfile(session.user.id, parsed.data);
  return NextResponse.json({ profile });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = z.object({ confirmName: z.string() }).safeParse(body);
  if (!parsed.success || parsed.data.confirmName !== session.user.name) {
    return NextResponse.json({ error: "Name doesn't match" }, { status: 400 });
  }

  await deleteProfile(session.user.id);
  return NextResponse.json({ ok: true });
}
