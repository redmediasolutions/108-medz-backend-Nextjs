import { NextResponse } from "next/server";

const FUNCTIONS_BASE_URL =
  process.env.FUNCTIONS_BASE_URL ?? "https://us-central1-medz-9eda1.cloudfunctions.net";

/** Proxies to Cloud Function `sendMsg91Otp` — body: { phoneNumber } */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phoneNumber = String(body?.phoneNumber ?? "").trim();

  if (!/^\d{10}$/.test(phoneNumber)) {
    return NextResponse.json({ success: false, error: "Enter a valid 10-digit number" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/sendMsg91Otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ success: false, error: "Invalid response from OTP service" }));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ success: false, error: "OTP service unreachable" }, { status: 502 });
  }
}
