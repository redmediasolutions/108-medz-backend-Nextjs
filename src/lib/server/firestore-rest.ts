// Server-only: import from route handlers (app/api/**) only — never from client components.

/**
 * Minimal Firestore REST client that acts *as the signed-in admin* (their ID token), so the
 * production security rules apply exactly as they do in the browser. No service account needed.
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const DB = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${DB}`;

export class FirestoreRestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Marker for a server timestamp (Firestore REQUEST_TIME transform). */
export const SERVER_TIME = Symbol("serverTime");

type Value = Record<string, unknown>;

export function encodeValue(v: unknown): Value {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } };
  return { stringValue: String(v) };
}

function encodeFields(o: Record<string, unknown>): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [k, v] of Object.entries(o)) if (v !== SERVER_TIME) out[k] = encodeValue(v);
  return out;
}

function decodeValue(v: Value): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return decodeFields(((v.mapValue as Value)?.fields ?? {}) as Record<string, Value>);
  if ("arrayValue" in v) return (((v.arrayValue as Value)?.values ?? []) as Value[]).map(decodeValue);
  if ("referenceValue" in v) return v.referenceValue;
  return null;
}

function decodeFields(f: Record<string, Value>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decodeValue(v)]));
}

async function call(token: string, url: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new FirestoreRestError("Could not reach Firebase", 503);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || json?.[0]?.error?.message || `Firestore error (${res.status})`;
    throw new FirestoreRestError(msg, res.status);
  }
  return json;
}

export const firestoreRest = {
  /** Read one document → plain object, or null when it does not exist. */
  async get(token: string, path: string): Promise<Record<string, unknown> | null> {
    try {
      const json = await call(token, `${BASE}/${path}`);
      return decodeFields(json.fields ?? {});
    } catch (e) {
      if (e instanceof FirestoreRestError && e.status === 404) return null;
      throw e;
    }
  },

  /** First document id in `collection` where `field == value`, or null. */
  async findId(token: string, collection: string, field: string, value: string): Promise<string | null> {
    const json = await call(token, `${BASE}:runQuery`, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } },
          limit: 1,
        },
      }),
    });
    const name: string | undefined = Array.isArray(json) ? json.find((r) => r.document)?.document?.name : undefined;
    return name ? name.split("/").pop()! : null;
  },

  /**
   * Create `path` only if it does not exist yet (never overwrites). Fields set to SERVER_TIME
   * become server timestamps, like serverTimestamp() in the app.
   */
  async create(token: string, path: string, data: Record<string, unknown>) {
    const serverTimeFields = Object.entries(data)
      .filter(([, v]) => v === SERVER_TIME)
      .map(([k]) => ({ fieldPath: k, setToServerValue: "REQUEST_TIME" }));
    await call(token, `${BASE}:commit`, {
      method: "POST",
      body: JSON.stringify({
        writes: [
          {
            update: { name: `${DB}/${path}`, fields: encodeFields(data) },
            currentDocument: { exists: false },
            ...(serverTimeFields.length && { updateTransforms: serverTimeFields }),
          },
        ],
      }),
    });
  },
};
