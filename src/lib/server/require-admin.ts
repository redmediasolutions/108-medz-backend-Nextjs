// Server-only: import from route handlers (app/api/**) only — never from client components.

/**
 * Verifies the caller is a signed-in 108Medz admin without firebase-admin:
 *  1. Firebase Auth REST `accounts:lookup` validates the ID token → uid
 *  2. Firestore REST reads Users/{uid} *as that user* (rules apply) → isAdmin
 * Results are cached per token for 5 minutes.
 */
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const TTL = 5 * 60 * 1000;

const cache = new Map<string, { uid: string; ok: boolean; at: number }>();

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(req: Request): Promise<string> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new AuthError("Not signed in", 401);

  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < TTL) {
    if (!hit.ok) throw new AuthError("Admins only", 403);
    return hit.uid;
  }

  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
    cache: "no-store",
  }).catch(() => {
    throw new AuthError("Could not verify sign-in (Firebase Auth unreachable)", 503);
  });
  if (!lookup.ok) throw new AuthError("Session expired, sign in again", 401);
  const uid: string | undefined = (await lookup.json())?.users?.[0]?.localId;
  if (!uid) throw new AuthError("Session expired, sign in again", 401);

  const userDoc = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/Users/${uid}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  ).catch(() => {
    throw new AuthError("Could not verify admin access (Firestore unreachable)", 503);
  });
  const json = userDoc.ok ? await userDoc.json() : null;
  const ok = json?.fields?.isAdmin?.booleanValue === true;

  if (cache.size > 500) cache.clear();
  cache.set(token, { uid, ok, at: Date.now() });
  if (!ok) throw new AuthError("Admins only", 403);
  return uid;
}
