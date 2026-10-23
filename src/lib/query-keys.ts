/**
 * Every React Query key in one place, so invalidation and cache sharing stay consistent.
 * Keys are hierarchical: invalidating ["orders"] refreshes every orders query.
 */
export const qk = {
  prescriptions: {
    all: ["prescriptions"] as const,
    active: () => ["prescriptions", "active"] as const,
    detail: (id: string) => ["prescriptions", "detail", id] as const,
    byUser: (userId: string) => ["prescriptions", "by-user", userId] as const,
  },
  products: {
    search: (term: string, page: number) => ["products", "search", term, page] as const,
  },
  customers: {
    all: ["customers"] as const,
    page: (filters: unknown, page: number, pageSize: number) => ["customers", "page", filters, page, pageSize] as const,
    count: (from: string, to: string) => ["customers", "count", from, to] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
    cart: (authUid: string) => ["customers", "cart", authUid] as const,
    addresses: (key: string) => ["customers", "addresses", key] as const,
    wallet: (userId: string) => ["customers", "wallet", userId] as const,
    lookup: (uid: string, phone: string) => ["customers", "lookup", uid, phone] as const,
  },
  orders: {
    all: ["orders"] as const,
    woo: (filters: unknown, page: number, pageSize: number) => ["orders", "woo", filters, page, pageSize] as const,
    app: (from: string) => ["orders", "app", from] as const,
    wooInclude: (ids: number[]) => ["orders", "woo-include", ids] as const,
    detail: (key: string) => ["orders", "detail", key] as const,
    appByUid: (uid: string) => ["orders", "app-by-uid", uid] as const,
    wooForCustomer: (phone: string, email: string) => ["orders", "woo-customer", phone, email] as const,
  },
  areas: {
    data: (preset: string) => ["areas", preset] as const,
    linked: (sig: string) => ["areas", "linked", sig] as const,
  },
};
