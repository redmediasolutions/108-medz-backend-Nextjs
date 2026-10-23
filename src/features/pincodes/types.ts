import type { OrderSource, UnifiedOrder } from "@/features/orders/types";

/** Why two orders were judged to be the same person. Strong = exact match; fuzzy = similarity. */
export type LinkReason =
  | "same-phone"
  | "same-email"
  | "same-account"
  | "same-address"
  | "similar-address"
  | "same-name-nearby";

export const LINK_LABEL: Record<LinkReason, string> = {
  "same-phone": "Same phone",
  "same-email": "Same email",
  "same-account": "Same app account",
  "same-address": "Same address",
  "similar-address": "Similar address",
  "same-name-nearby": "Same name, nearby address",
};

/** One real person / household, possibly ordering from several phones, accounts or names. */
export type PersonCluster = {
  id: string;
  /** most frequent name first */
  names: string[];
  phones: string[];
  emails: string[];
  /** Firebase uids (app accounts) */
  accounts: string[];
  pincodes: string[];
  addresses: string[];
  reasons: LinkReason[];
  orders: UnifiedOrder[];
  orderCount: number;
  spend: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  bySource: Record<OrderSource, number>;
  /** ordered with more than one phone or app account */
  multiIdentity: boolean;
};

export type ProductCount = { productId: number; name: string; quantity: number; orders: number };

export type PincodeStat = {
  pincode: string;
  /** most common city / state seen on orders to this pincode */
  city: string;
  state: string;
  orders: number;
  revenue: number;
  avgOrder: number;
  cancelled: number;
  people: number;
  multiIdentityPeople: number;
  bySource: Record<OrderSource, number>;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  topProducts: ProductCount[];
};

export type RangePreset = "30d" | "90d" | "12m" | "all";

export const RANGE_LABEL: Record<RangePreset, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

export const UNKNOWN_PINCODE = "unknown";
