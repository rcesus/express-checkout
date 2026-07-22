import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/lib/crypto";

const COOKIE_NAME = "payabli_private_token";

export async function POST(req: NextRequest) {
  let body: { privateToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const privateToken = body.privateToken?.trim();
  if (!privateToken) {
    return NextResponse.json({ error: "privateToken is required." }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encrypt(privateToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const hasPrivateToken = !!raw && decrypt(raw) !== null;
  return NextResponse.json({ hasPrivateToken });
}
