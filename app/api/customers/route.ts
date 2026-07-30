import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/crypto";

const COOKIE_NAME = "payabli_private_token";
const API_BASE = "https://api-sandbox.payabli.com/api";

// A customer record as this app uses it, normalized out of Payabli's mixed
// PascalCase (Firstname) / camelCase (customerId) response casing.
type Customer = {
  customerId: string | number;
  customerNumber?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

// Payabli returns response fields PascalCase but IDs camelCase, and casing isn't
// guaranteed stable, so pick keys case-insensitively.
function pick(record: Record<string, unknown>, ...keys: string[]): string {
  const lower = Object.keys(record).reduce<Record<string, unknown>>((acc, k) => {
    acc[k.toLowerCase()] = record[k];
    return acc;
  }, {});
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== null) return String(v);
  }
  return "";
}

function normalize(record: Record<string, unknown>): Customer {
  return {
    customerId: pick(record, "customerId"),
    customerNumber: pick(record, "customerNumber"),
    firstName: pick(record, "firstname"),
    lastName: pick(record, "lastname"),
    email: pick(record, "email"),
    address1: pick(record, "address1"),
    city: pick(record, "city"),
    state: pick(record, "state"),
    zip: pick(record, "zip"),
    country: pick(record, "country"),
  };
}

export async function GET(req: NextRequest) {
  const entryPoint = req.nextUrl.searchParams.get("entryPoint")?.trim();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!entryPoint) {
    return NextResponse.json({ error: "entryPoint is required." }, { status: 400 });
  }
  if (!q) {
    return NextResponse.json({ error: "q is required." }, { status: 400 });
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

  // Query filters AND together, so a single request can't express "firstname OR
  // lastname OR email contains q". Fire one contains-filtered request per field
  // and merge. limitRecord caps each field's hits.
  const base = `${API_BASE}/Query/customers/${encodeURIComponent(entryPoint)}`;
  const fields = ["firstname", "lastname", "email"];
  const requests = fields.map((field) => {
    const url = `${base}?${field}(ct)=${encodeURIComponent(q)}&limitRecord=25`;
    return fetch(url, { headers: { requestToken: privateToken } });
  });

  let responses: Response[];
  try {
    responses = await Promise.all(requests);
  } catch {
    return NextResponse.json({ error: "Customer search request failed." }, { status: 502 });
  }

  const byId = new Map<string, Customer>();
  for (const res of responses) {
    const text = await res.text();
    if (!res.ok) continue;
    let data: { Records?: unknown } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      continue;
    }
    const records = Array.isArray(data?.Records) ? data!.Records : [];
    for (const rec of records) {
      if (rec && typeof rec === "object") {
        const c = normalize(rec as Record<string, unknown>);
        const key = String(c.customerId);
        if (key && !byId.has(key)) byId.set(key, c);
      }
    }
  }

  return NextResponse.json({ customers: [...byId.values()] });
}
