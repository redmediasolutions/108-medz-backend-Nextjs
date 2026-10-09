import { NextResponse } from "next/server";

const FUNCTIONS_BASE_URL =
  process.env.FUNCTIONS_BASE_URL ?? "https://us-central1-medz-9eda1.cloudfunctions.net";

/** Proxies to Cloud Function `verifyMsg91Otp` — body: { phoneNumber, otp, reqId } → { success, token } */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phoneNumber = String(body?.phoneNumber ?? "").trim();
  const otp = String(body?.otp ?? "").trim();
  const reqId = body?.reqId ?? null;

  if (!phoneNumber || otp.length < 4) {
    return NextResponse.json({ success: false, message: "Enter valid OTP" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/verifyMsg91Otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, otp, reqId }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ success: false, message: "Invalid response from OTP service" }));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ success: false, message: "OTP service unreachable" }, { status: 502 });
  }
}
