"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CreditCard,
  History,
  Loader2,
  MapPin,
  Minus,
  PackageSearch,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Truck,
  UserPlus,
} from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCustomer, useCustomerAddresses } from "@/features/customers/hooks/use-customer-detail";
import { customersService } from "@/features/customers/services/customers.service";
import type { Customer } from "@/features/customers/types";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { useProductSearch } from "@/features/products/hooks/use-product-search";
import type { Product } from "@/features/products/types";
import { formatINRStrict, phoneKey } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { useCreateStaffOrder } from "../hooks/use-create-order";
import { useCustomerOrders } from "../hooks/use-customer-orders";
import {
  computeTotals,
  FREE_SHIPPING_FROM,
  productPrice,
  type StaffPaymentMode,
} from "../lib/order-pricing";
import type { StaffOrderAddress } from "../types";

type Line = { productId: number; name: string; image: string | null; salt: string; price: number; quantity: number };

const EMPTY_ADDRESS: StaffOrderAddress = { name: "", phone: "", address1: "", address2: "", city: "", state: "Kerala", postcode: "" };
const STATES = ["Kerala", "Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Maharashtra", "Goa", "Puducherry"];

// Configured exclusively for Cash on Delivery & Pay via Razorpay
const ACTIVE_PAYMENT_MODES: { value: StaffPaymentMode; label: string; hint: string }[] = [
  {
    value: "cod",
    label: "Cash on Delivery",
    hint: "Collect payment upon doorstep delivery",
  },
  {
    value: "razorpay" as StaffPaymentMode,
    label: "Pay via Razorpay",
    hint: "Payment link, UPI, card, or net banking",
  },
];

const newRef = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export function NewOrderForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const presetCustomerId = sp.get("customer") ?? "";

  const [phoneInput, setPhoneInput] = React.useState(() => phoneKey(sp.get("phone")) || "");
  const [linked, setLinked] = React.useState<Customer | null>(null);
  const [asNewCaller, setAsNewCaller] = React.useState(false);
  const [address, setAddress] = React.useState<StaffOrderAddress>(EMPTY_ADDRESS);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [mode, setMode] = React.useState<StaffPaymentMode>("cod");
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const clientRef = React.useRef(newRef());

  const create = useCreateStaffOrder();
  const phone = phoneKey(phoneInput);
  const phoneValid = phone.length === 10;

  // ---- Customer: preset from ?customer=<Users doc id> ----
  const preset = useCustomer(presetCustomerId || "__none__");
  React.useEffect(() => {
    const c = preset.data;
    if (!presetCustomerId || !c) return;
    setLinked(c);
    setPhoneInput(phoneKey(c.phone) || c.phone);
    setAddress((a) => ({ ...a, name: a.name || c.name, phone: a.phone || phoneKey(c.phone) }));
  }, [presetCustomerId, preset.data]);

  // ---- Customer: app accounts with this phone number ----
  const matches = useQuery({
    queryKey: qk.customers.page({ phone, from: "", to: "" }, 1, 5),
    queryFn: () => customersService.fetchPage({ phone, from: "", to: "" }).then((r) => r.items),
    enabled: phoneValid,
    staleTime: 60_000,
  });
  const appAccounts = React.useMemo(() => matches.data ?? [], [matches.data]);

  React.useEffect(() => {
    if (!phoneValid) {
      if (!presetCustomerId) setLinked(null);
      return;
    }
    if (linked && phoneKey(linked.phone) === phone) return;
    if (!asNewCaller && appAccounts.length === 1) setLinked(appAccounts[0]);
    else if (linked && phoneKey(linked.phone) !== phone) setLinked(null);
  }, [phone, phoneValid, appAccounts, asNewCaller, linked, presetCustomerId]);

  React.useEffect(() => {
    if (phoneValid) setAddress((a) => ({ ...a, phone }));
  }, [phone, phoneValid]);

  React.useEffect(() => {
    if (linked) setAddress((a) => ({ ...a, name: a.name || linked.name }));
  }, [linked]);

  // ---- Previous addresses ----
  const saved = useCustomerAddresses(linked);
  const history = useCustomerOrders(phoneValid ? { uid: linked?.authUid ?? null, phone, email: linked?.email ?? "" } : null);
  const suggestions = React.useMemo(() => {
    const out: { key: string; label: string; source: string; value: StaffOrderAddress }[] = [];
    const seen = new Set<string>();
    const push = (source: string, v: StaffOrderAddress) => {
      const sig = `${v.address1}|${v.postcode}`.toLowerCase().replace(/[^a-z0-9|]/g, "");
      if (!v.address1 || seen.has(sig)) return;
      seen.add(sig);
      out.push({ key: sig, label: [v.address1, v.city, v.postcode].filter(Boolean).join(", "), source, value: v });
    };
    for (const a of saved.data) {
      push(a.label || "Saved", {
        name: a.name,
        phone: phoneKey(a.phone) || phone,
        address1: a.address1,
        address2: a.landmark,
        city: "",
        state: a.state || "Kerala",
        postcode: a.pincode,
      });
    }
    for (const o of history.orders) {
      const s = o.shippingAddress.address1 ? o.shippingAddress : o.billing;
      push(`Order #${o.number}`, {
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        phone: phoneKey(s.phone) || phone,
        address1: s.address1,
        address2: s.address2,
        city: s.city,
        state: s.state.trim() || "Kerala",
        postcode: s.postcode.replace(/\s/g, ""),
      });
      if (out.length >= 6) break;
    }
    return out;
  }, [saved.data, history.orders, phone]);

  // ---- Totals ----
  const totals = computeTotals(lines, mode);
  const toFreeShipping = totals.subtotal > 0 && totals.shipping ? FREE_SHIPPING_FROM - totals.subtotal : 0;

  const problems: string[] = [];
  if (!phoneValid) problems.push("Enter the caller's 10-digit phone number");
  if (!address.name.trim()) problems.push("Enter the customer's name");
  if (!address.address1.trim()) problems.push("Enter the delivery address");
  if (!/^[1-9]\d{5}$/.test(address.postcode.trim())) problems.push("Enter a 6-digit pincode");
  if (!address.state.trim()) problems.push("Enter the state");
  if (lines.length === 0) problems.push("Add at least one medicine");
  if (lines.some((l) => l.price <= 0)) problems.push("A medicine has no price");

  function addProduct(p: Product) {
    const price = productPrice(p);
    setLines((ls) => {
      const i = ls.findIndex((l) => l.productId === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantity: Math.min(999, l.quantity + 1) } : l));
      return [...ls, { productId: p.id, name: p.name, image: p.image, salt: p.salt, price, quantity: 1 }];
    });
  }

  const setQty = (id: number, q: number) =>
    setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, quantity: Math.max(1, Math.min(999, Math.floor(q) || 1)) } : l)));
  const removeLine = (id: number) => setLines((ls) => ls.filter((l) => l.productId !== id));

  async function submit() {
    try {
      const res = await create.mutateAsync({
        uid: linked && !asNewCaller ? linked.authUid : null,
        address: { ...address, phone },
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          price: l.price,
          quantity: l.quantity,
          image: l.image,
          salt: l.salt,
        })),
        payment: {
          mode,
          reference: mode === "cod" ? "" : reference,
        },
        note,
        clientRef: clientRef.current,
      });

      clientRef.current = newRef();
      toast.success(`Order #${res.wooOrderId} placed · ${formatINRStrict(res.finalPayable)}`);
      if (res.razorpayOrderId) {
        toast.info(`Razorpay Order ID: ${res.razorpayOrderId}`);
      }
      if (res.warning) {
        toast.warning(res.warning, { duration: 10_000 });
      }

      router.push(`/orders/${res.wooOrderId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place the order");
      throw e;
    }
  }

  const appLinked = Boolean(linked && !asNewCaller);

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="New order"
        description="Place an order for a customer who called the office. It's saved exactly like an app order."
        actions={
          <Button variant="outline" asChild>
            <Link href="/orders">Cancel</Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          {/* ------------ 1. Customer ------------ */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>1 · Customer</CardTitle>
              <CardDescription>Start with the phone number — we&apos;ll find their app account and past addresses.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">+91</span>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    autoFocus={!presetCustomerId}
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setAsNewCaller(false);
                    }}
                    placeholder="98765 43210"
                    className="pl-11 tabular-nums"
                  />
                  {matches.isFetching && (
                    <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
                  )}
                </div>
              </div>

              {phoneValid && !matches.isPending && (
                <div className="grid gap-2">
                  {appAccounts.map((c) => {
                    const active = appLinked && linked?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setLinked(c);
                          setAsNewCaller(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                          active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <Smartphone className="text-primary size-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.name || "App user (no name)"}</div>
                          <div className="text-muted-foreground text-xs">App account · order will show in their app</div>
                        </div>
                        {active && <Check className="text-primary size-4" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setAsNewCaller(true);
                      setLinked(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      !appLinked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <UserPlus className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {appAccounts.length ? "Order without linking the app account" : "New caller"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {appAccounts.length
                          ? "Saved by phone number only"
                          : "No app account with this number — the order is saved by phone number"}
                      </div>
                    </div>
                    {!appLinked && <Check className="text-primary size-4" />}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------ 2. Delivery address ------------ */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>2 · Delivery address</CardTitle>
              <CardDescription>Pick a previous address or type a new one.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {phoneValid && (history.loading || saved.loading) && suggestions.length === 0 ? (
                <Skeleton className="h-14 w-full" />
              ) : (
                suggestions.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setAddress({ ...s.value, name: s.value.name || address.name, phone })}
                        className="hover:bg-muted/50 flex items-start gap-2 rounded-lg border p-3 text-left text-sm"
                      >
                        {s.source.startsWith("Order") ? (
                          <History className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        ) : (
                          <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="text-muted-foreground block text-xs">{s.source}</span>
                          <span className="line-clamp-2">{s.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" id="name">
                  <Input id="name" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
                </Field>
                <Field label="Phone" id="addr-phone">
                  <Input id="addr-phone" value={phoneValid ? `+91 ${phone}` : ""} disabled placeholder="From step 1" />
                </Field>
                <Field label="House / building, street" id="address1" className="sm:col-span-2">
                  <Textarea
                    id="address1"
                    rows={2}
                    value={address.address1}
                    onChange={(e) => setAddress({ ...address, address1: e.target.value })}
                  />
                </Field>
                <Field label="Landmark / area (optional)" id="address2">
                  <Input id="address2" value={address.address2} onChange={(e) => setAddress({ ...address, address2: e.target.value })} />
                </Field>
                <Field label="City / town" id="city">
                  <Input id="city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </Field>
                <Field label="Pincode" id="postcode">
                  <Input
                    id="postcode"
                    inputMode="numeric"
                    maxLength={7}
                    value={address.postcode}
                    onChange={(e) => setAddress({ ...address, postcode: e.target.value.replace(/[^\d]/g, "") })}
                    className="tabular-nums"
                  />
                </Field>
                <Field label="State" id="state">
                  <Input id="state" list="states" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                  <datalist id="states">
                    {STATES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* ------------ 3. Medicines ------------ */}
          <MedicinesCard lines={lines} onAdd={addProduct} onQty={setQty} onRemove={removeLine} />

          {/* ------------ 4. Payment ------------ */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>4 · Payment</CardTitle>
              <CardDescription>Select payment method for this order.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {ACTIVE_PAYMENT_MODES.map((m) => {
                  const Icon = m.value === "cod" ? Truck : CreditCard;
                  const active = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMode(m.value)}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                        {m.label}
                      </span>
                      <span className="text-muted-foreground text-xs">{m.hint}</span>
                    </button>
                  );
                })}
              </div>

              {mode === ("razorpay" as StaffPaymentMode) && (
                <Field
                  label="Razorpay Payment ID / Payment Link ID (optional)"
                  id="ref"
                  className="sm:max-w-md"
                >
                  <Input
                    id="ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. pay_O123456789 or plink_xxx"
                  />
                </Field>
              )}

              <Field label="Note for the order (optional)" id="note">
                <Textarea
                  id="note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. deliver after 5 pm"
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* ------------ Summary ------------ */}
        <Card className="gap-4 lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {appLinked ? (
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="size-3.5" /> Linked to {linked?.name || "app account"}
                </span>
              ) : phoneValid ? (
                "Phone order (no app account)"
              ) : (
                "No customer yet"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label={`Items (${lines.reduce((s, l) => s + l.quantity, 0)})`} value={totals.subtotal} />
            <Row label="Tax (5%)" value={totals.tax} />
            <Row label="Delivery" value={totals.shipping} free={totals.subtotal > 0 && !totals.shipping} />
            {totals.codCharge > 0 && <Row label="COD charge" value={totals.codCharge} />}
            <Separator className="my-1" />
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{mode === "cod" ? "To collect on delivery" : "Total prepaid (Razorpay)"}</span>
              <span className="text-lg font-semibold tabular-nums">{formatINRStrict(totals.finalPayable)}</span>
            </div>
            {toFreeShipping > 0 && (
              <p className="text-muted-foreground text-xs">Add {formatINRStrict(toFreeShipping)} more for free delivery.</p>
            )}

            {problems.length > 0 && lines.length > 0 && (
              <ul className="text-muted-foreground mt-2 grid gap-1 text-xs">
                {problems.map((p) => (
                  <li key={p} className="flex items-center gap-1.5">
                    <AlertTriangle className="text-warning size-3.5" /> {p}
                  </li>
                ))}
              </ul>
            )}

            <Button className="mt-3 w-full" size="lg" disabled={problems.length > 0 || create.isPending} onClick={() => setConfirmOpen(true)}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Place order
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Place order for ${formatINRStrict(totals.finalPayable)}?`}
        description={
          <span className="grid gap-1">
            <span>
              {address.name} · +91 {phone} · {address.postcode}
            </span>
            <span>
              {lines.length} medicine{lines.length === 1 ? "" : "s"} · {ACTIVE_PAYMENT_MODES.find((m) => m.value === mode)?.label}
            </span>
            <span>
              This creates a real order in WooCommerce and Firebase
              {appLinked ? " and it will appear in the customer's app." : "."}
            </span>
          </span>
        }
        confirmLabel="Place order"
        onConfirm={submit}
      />
    </div>
  );
}

function Field({ label, id, className, children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, free }: { label: string; value: number; free?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{free ? "Free" : formatINRStrict(value)}</span>
    </div>
  );
}

function MedicinesCard({
  lines,
  onAdd,
  onQty,
  onRemove,
}: {
  lines: Line[];
  onAdd: (p: Product) => void;
  onQty: (id: number, q: number) => void;
  onRemove: (id: number) => void;
}) {
  const [query, setQuery] = React.useState("");
  const { results, loading, fetching, error, searched } = useProductSearch(query, 1);
  const inCart = new Map(lines.map((l) => [l.productId, l.quantity]));

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>3 · Medicines</CardTitle>
        <CardDescription>Search by name or salt. Prices are confirmed from the store when the order is placed.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medicine name or salt" className="pl-9" />
          {(loading || fetching) && (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
          )}
        </div>

        {searched && (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            {error ? (
              <EmptyState title="Search failed" description={error} className="py-8" />
            ) : loading && results.length === 0 ? (
              <div className="grid gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No medicines found" description="Try another spelling or the salt name." className="py-8" />
            ) : (
              <ul className="divide-y">
                {results.map((p) => {
                  const price = productPrice(p);
                  const qty = inCart.get(p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <ProductThumb src={p.image} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-muted-foreground truncate text-xs">
                          {[p.salt, p.productContent].filter(Boolean).join(" · ") || `#${p.id}`}
                        </div>
                      </div>
                      <span className="text-sm tabular-nums">{price ? formatINRStrict(price) : "—"}</span>
                      <Button size="sm" variant={qty ? "secondary" : "outline"} disabled={!price} onClick={() => onAdd(p)}>
                        <Plus />
                        {qty ? `Add (${qty})` : "Add"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {lines.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">No medicines added yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {lines.map((l) => (
              <li key={l.productId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <ProductThumb src={l.image} className="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{l.name}</div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {formatINRStrict(l.price)} each
                    {l.salt && <> · {l.salt}</>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="size-8" aria-label="Decrease" disabled={l.quantity <= 1} onClick={() => onQty(l.productId, l.quantity - 1)}>
                    <Minus />
                  </Button>
                  <Input
                    aria-label="Quantity"
                    inputMode="numeric"
                    value={l.quantity}
                    onChange={(e) => onQty(l.productId, Number(e.target.value.replace(/[^\d]/g, "")))}
                    className="h-8 w-14 text-center tabular-nums"
                  />
                  <Button size="icon" variant="outline" className="size-8" aria-label="Increase" onClick={() => onQty(l.productId, l.quantity + 1)}>
                    <Plus />
                  </Button>
                </div>
                <span className="w-20 text-right text-sm font-medium tabular-nums">{formatINRStrict(l.price * l.quantity)}</span>
                <Button size="icon" variant="ghost" className="text-muted-foreground size-8" aria-label="Remove" onClick={() => onRemove(l.productId)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <Badge variant="secondary" className="w-fit">
            {lines.length} medicine{lines.length === 1 ? "" : "s"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}