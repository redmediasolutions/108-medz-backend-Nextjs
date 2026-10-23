/**
 * Small fetch wrapper for calling our own Next.js route handlers (/api/*).
 * Throws an Error with the server's message when the response is not ok
 * or when the backend replies with { success: false }.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Firebase ID token of the signed-in admin, sent so /api routes can verify the caller. */
async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const { auth } = await import("@/firebase/config");
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(await authHeader()), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Network error. Check your connection.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new ApiError(String(message), res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(body) }),
};
