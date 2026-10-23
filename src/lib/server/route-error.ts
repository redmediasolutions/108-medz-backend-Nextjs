// Server-only: import from route handlers (app/api/**) only — never from client components.
import { NextResponse } from "next/server";

/** Turns AuthError / WooError (anything with .status) into a JSON response. */
export function routeError(e: unknown) {
  const status = typeof (e as { status?: unknown })?.status === "number" ? (e as { status: number }).status : 500;
  const message = e instanceof Error ? e.message : "Something went wrong";
  if (status >= 500) console.error("[api]", e);
  return NextResponse.json({ message }, { status });
}
