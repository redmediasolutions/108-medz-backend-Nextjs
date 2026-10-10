import { customersRepository as repo, type CustomerCursor } from "../repository/customers.repository";
import { CUSTOMERS_PAGE_SIZE, type CustomerFilters, type WalletAdjustment } from "../types";

export type { CustomerCursor };

export const customersService = {
  fetchPage: (filters: CustomerFilters, cursor: CustomerCursor = null) =>
    repo.fetchPage(filters, cursor, CUSTOMERS_PAGE_SIZE),

  count: repo.count,
  fetchAll: repo.fetchAll,

  subscribeCustomer: repo.subscribeCustomer,
  subscribeOrders: repo.subscribeOrders,
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
