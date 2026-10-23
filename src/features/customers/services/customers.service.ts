import { customersRepository as repo, type CustomerCursor } from "../repository/customers.repository";
import { CUSTOMERS_PAGE_SIZE, type CustomerFilters, type WalletAdjustment } from "../types";

export type { CustomerCursor };

/**
 * Firestore has no "skip N", so numbered pages are built from a cursor chain:
 * cursors[k] = last doc of page k for a given filter set + page size. Visited pages are instant;
 * jumping ahead walks forward from the nearest known page.
 */
const cursorChains = new Map<string, CustomerCursor[]>();

export const customersService = {
  fetchPage: (filters: CustomerFilters, cursor: CustomerCursor = null) =>
    repo.fetchPage(filters, cursor, CUSTOMERS_PAGE_SIZE),

  async fetchPageAt(filters: CustomerFilters, page: number, pageSize: number) {
    const key = JSON.stringify([filters, pageSize]);
    const chain = cursorChains.get(key) ?? [];
    cursorChains.set(key, chain);
    // highest page (< requested) whose end-cursor we already have; 0 = start from the beginning
    let known = Math.max(0, Math.min(page - 1, chain.length - 1));
    while (known > 0 && !chain[known]) known--;
    let cursor: CustomerCursor = known > 0 ? chain[known] : null;
    for (let p = known + 1; p < page; p++) {
      const r = await repo.fetchPage(filters, cursor, pageSize);
      chain[p] = r.cursor;
      cursor = r.cursor;
      if (!r.hasMore) return { items: [], hasMore: false };
    }
    const r = await repo.fetchPage(filters, cursor, pageSize);
    chain[page] = r.cursor;
    return { items: r.items, hasMore: r.hasMore };
  },

  count: repo.count,
  fetchAll: repo.fetchAll,

  findCustomerId: repo.findCustomerId,
  subscribeCustomer: repo.subscribeCustomer,
  subscribeCart: repo.subscribeCart,
  subscribeAddresses: repo.subscribeAddresses,
  subscribeWallet: repo.subscribeWallet,

  async updateCartQuantity(authUid: string, itemId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a whole number above 0");
    await repo.updateCartQuantity(authUid, itemId, quantity);
  },
  removeCartItem: repo.removeCartItem,
  clearCart: repo.clearCart,

  async adjustWallet(userId: string, adj: WalletAdjustment) {
    const amount = Math.trunc(adj.amount); // Flutter stored amount.toInt()
    if (!amount || amount <= 0) throw new Error("Enter an amount above 0");
    if (!adj.reason.trim()) throw new Error("Reason is required");
    await repo.adjustWallet(userId, { ...adj, amount, reason: adj.reason.trim() });
  },

  /** "Redeem for Cash" — a debit with the reason prefixed, same as Flutter. */
  redeem(userId: string, amount: number, reason: string) {
    return customersService.adjustWallet(userId, {
      amount,
      status: "debited",
      reason: reason.trim() ? `Redeemed: ${reason.trim()}` : "",
    });
  },
};
