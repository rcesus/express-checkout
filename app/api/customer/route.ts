import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { decrypt } from "@/lib/crypto";
import { CUSTOMER } from "@/lib/personas";

const COOKIE_NAME = "payabli_private_token";
const API_BASE = "https://api-sandbox.payabli.com/api";

export async function POST(req: NextRequest) {
  let body: { entryPoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const entryPoint = body.entryPoint?.trim();
  if (!entryPoint) {
    return NextResponse.json({ error: "entryPoint is required." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const privateToken = raw ? decrypt(raw) : null;
  if (!privateToken) {
    return NextResponse.json(
      { error: "No private token saved. Open settings (gear icon) and enter one." },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_BASE}/Customer/single/${encodeURIComponent(entryPoint)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      requestToken: privateToken,
      idempotencyKey: randomUUID(),
    },
    body: JSON.stringify({
      firstname: CUSTOMER.firstName,
      lastname: CUSTOMER.lastName,
      email: CUSTOMER.email,
      address1: CUSTOMER.address1,
      city: CUSTOMER.city,
      state: CUSTOMER.state,
      zip: CUSTOMER.zip,
      country: CUSTOMER.country,
      identifierFields: ["email"],
    }),
  });

  const text = await res.text();
  let data: { isSuccess?: boolean; responseData?: unknown; responseText?: string } | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    // non-JSON error body; fall through to the generic error below
  }

  if (!res.ok || !data || data.isSuccess === false) {
    // A duplicate identifier means the customer already exists. Look it up by
    // email and reuse that record instead of failing.
    const existingId = await findCustomerId(entryPoint, privateToken);
    if (existingId !== null) {
      return NextResponse.json({ customerId: existingId });
    }
    const detail = data?.responseText || text.slice(0, 300) || res.statusText;
    return NextResponse.json(
      { error: `Customer creation failed: ${detail}` },
      { status: res.ok ? 502 : res.status },
    );
  }

  const responseData = data.responseData as { customerId?: unknown } | number | string | null;
  const customerId =
    typeof responseData === "object" && responseData !== null
      ? responseData.customerId
      : responseData;
  if (typeof customerId !== "number" && typeof customerId !== "string") {
    return NextResponse.json(
      { error: "Customer creation returned no customer ID." },
      { status: 502 },
    );
  }

  return NextResponse.json({ customerId });
}

// Looks up an existing customer by the persona email for a paypoint and returns
// its customerId, or null if none is found or the lookup fails.
async function findCustomerId(
  entryPoint: string,
  privateToken: string,
): Promise<number | string | null> {
  const filter = `${encodeURIComponent("email(eq)")}=${encodeURIComponent(CUSTOMER.email)}`;
  const url = `${API_BASE}/Query/customers/${encodeURIComponent(entryPoint)}?${filter}`;
  try {
    const res = await fetch(url, { headers: { requestToken: privateToken } });
    if (!res.ok) return null;
    const data = (await res.json()) as { Records?: Array<{ customerId?: unknown }> };
    const id = data?.Records?.[0]?.customerId;
    return typeof id === "number" || typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
