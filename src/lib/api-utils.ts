import { NextResponse } from "next/server";
import { z } from "zod";

export async function safeJson(request: Request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

export const uuidParam = z.string().uuid();
