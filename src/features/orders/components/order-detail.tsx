"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileQuestion,
  FileText,
  Link2,
  Loader2,
  Lock,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Send,
  User,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/firebase/config";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { formatINRStrict } from "@/lib/format";
import { formatDateTime, timeAgo } from "@/lib/time-ago";

import { addressLines } from "../lib/order-utils";
import { ordersService } from "../services/orders.service";
import type { OrderAddress } from "../types";
import { customerHref } from "./customer-link";

const STORE = process.env.NEXT_PUBLIC_STORE_BASE_URL ?? "https://janmanstore.in";

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2" asChild>
      <Link href="/orders">
        <ArrowLeft /> Orders
      </Link>
    </Button>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: React.ReactNode; tone?: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <button
        type="button"
        className="hover:text-primary inline-flex min-w-0 items-center gap-1 font-mono text-xs"
        onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`))}
      >
        <span className="truncate">{value}</span>
        <Copy className="size-3 shrink-0" />
      </button>
    </div>
  );
}

function AddressCard({ title, a }: { title: string; a?: Partial<OrderAddress> | null }) {
  if (!a) {
    return (
      <div className="min-w-0">
        <div className="text-muted-foreground mb-1 text-xs font-medium">{title}</div>
        <div className="text-muted-foreground text-sm">—</div>
      </div>
    );
  }

  const lines = addressLines(a as OrderAddress);
  const name = (a as any).name || [a.firstName, a.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-w-0">
      <div className="text-muted-foreground mb-1 text-xs font-medium">{title}</div>
      {name || lines.length ? (
        <>
          {name && <div className="text-sm font-medium">{name}</div>}
          {a.phone && <div className="text-muted-foreground text-sm tabular-nums">{a.phone}</div>}
          <div className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {lines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-sm">—</div>
      )}
    </div>
  );
}

export function OrderDetail({ orderKey }: { orderKey: string }) {
  const [firestoreOrder, setFirestoreOrder] = React.useState<any>(null);
  const [legacyWooOrder, setLegacyWooOrder] = React.useState<any>(null);
  const [wooNotes, setWooNotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [savingPrices, setSavingPrices] = React.useState(false);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = React.useState(false);

  // In-flight price, quantity, and shipping edits
  const [customItemPrices, setCustomItemPrices] = React.useState<Record<string | number, number>>({});
  const [customItemQuantities, setCustomItemQuantities] = React.useState<Record<string | number, number>>({});
  const [customShipping, setCustomShipping] = React.useState<number | null>(null);
  const [isEditingShipping, setIsEditingShipping] = React.useState(false);

  // Dual-source Loader: Firestore Realtime -> WooCommerce Fallback
  React.useEffect(() => {
    if (!orderKey) return;
    setLoading(true);

    const docRef = doc(db, "Orders", String(orderKey));
    const unsubscribe = onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          setFirestoreOrder({ id: snap.id, ...snap.data() });
          setLoading(false);
          setError(null);
        } else {
          try {
            const res = await ordersService.get(orderKey);
            if (res.order) {
              setLegacyWooOrder(res.order);
              setWooNotes(res.notes || []);
              setError(null);
            } else {
              setError(`Order #${orderKey} could not be found in Firestore or WooCommerce.`);
            }
          } catch (e: any) {
            console.error("WooCommerce fallback load error:", e);
            setError(e.message || "Failed to load order.");
          } finally {
            setLoading(false);
          }
        }
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderKey]);

  // Merge active record
  const order = React.useMemo(() => {
    if (firestoreOrder) return firestoreOrder;
    if (!legacyWooOrder) return null;

    return {
      id: legacyWooOrder.wooId || legacyWooOrder.number || orderKey,
      number: legacyWooOrder.number,
      wooId: legacyWooOrder.wooId,
      status: legacyWooOrder.status,
      paymentStatus: legacyWooOrder.payment?.state === "paid" ? "captured" : "pending",
      paymentMethod: legacyWooOrder.payment?.method || "cod",
      items: legacyWooOrder.items.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        image: it.image,
        sku: it.sku,
        requiresPrescription: it.requiresPrescription,
      })),
      subtotal: legacyWooOrder.subtotal,
      shipping: legacyWooOrder.shipping,
      tax: legacyWooOrder.tax,
      discount: legacyWooOrder.discount,
      total: legacyWooOrder.total,
      customer: legacyWooOrder.customer,
      shippingAddress: legacyWooOrder.shippingAddress,
      billing: legacyWooOrder.billing,
      customerNote: legacyWooOrder.customerNote,
      createdAt: legacyWooOrder.createdAt,
      paidAt: legacyWooOrder.payment?.paidAt,
      transactionId: legacyWooOrder.payment?.transactionId,
      isLegacyWoo: true,
    };
  }, [firestoreOrder, legacyWooOrder, orderKey]);

  const isPaid =
    order?.paymentStatus === "captured" ||
    order?.paymentLinkStatus === "paid" ||
    order?.status === "completed" ||
    order?.finalized === true;

  const paymentLinkUrl = order?.paymentLinkUrl || "";
  const paymentLinkStatus = order?.paymentLinkStatus || "";
  const hasLinkGenerated = Boolean(paymentLinkUrl);

  const isCodOrder =
    String(order?.paymentMethod || "").toLowerCase().includes("cod") ||
    String(order?.paymentMethod || "").toLowerCase().includes("cash");

  // EDIT LOCK RULE
  const isLocked = isCodOrder ? hasLinkGenerated : (isPaid || hasLinkGenerated);

  React.useEffect(() => {
    if (isLocked) {
      setIsEditingShipping(false);
      setCustomItemPrices({});
      setCustomItemQuantities({});
      setCustomShipping(null);
    }
  }, [isLocked]);

  // Price & Quantity calculations
  const items: any[] = order?.items || [];
  const activeItems = React.useMemo(() => {
    return items.map((it: any) => {
      const itemKey = it.productId || it.sku || it.name;
      const unitPrice =
        !isLocked && customItemPrices[itemKey] !== undefined
          ? customItemPrices[itemKey]
          : Number(it.price || 0);

      const qty =
        !isLocked && customItemQuantities[itemKey] !== undefined
          ? customItemQuantities[itemKey]
          : Number(it.quantity || 1);

      return {
        ...it,
        price: unitPrice,
        quantity: qty,
        total: Math.round(unitPrice * qty * 100) / 100,
      };
    });
  }, [items, customItemPrices, customItemQuantities, isLocked]);

  const activeSubtotal = React.useMemo(() => {
    if (!order) return 0;
    const hasItemEdits = Object.keys(customItemPrices).length > 0 || Object.keys(customItemQuantities).length > 0;
    if (isLocked || !hasItemEdits) {
      return Number(order.subtotal || activeItems.reduce((acc, it) => acc + it.total, 0));
    }
    return activeItems.reduce((acc, it) => acc + it.total, 0);
  }, [order, activeItems, customItemPrices, customItemQuantities, isLocked]);

  const activeShipping = React.useMemo(() => {
    if (!order) return 0;
    if (isLocked) return Number(order.shipping || 0);
    return customShipping !== null ? Math.max(0, customShipping) : Number(order.shipping || 0);
  }, [order, customShipping, isLocked]);

  const activeTax = React.useMemo(() => {
    if (!order) return 0;
    const hasItemEdits = Object.keys(customItemPrices).length > 0 || Object.keys(customItemQuantities).length > 0;
    if (isLocked || !hasItemEdits) {
      return Number(order.tax || 0);
    }
    return Math.round(activeSubtotal * 0.05);
  }, [order, activeSubtotal, customItemPrices, customItemQuantities, isLocked]);

  const activeTotal = React.useMemo(() => {
    if (!order) return 0;
    if (isLocked) return Number(order.total || 0);

    const discount = Number(order.discount || 0);
    const codCharge = Number(order.codCharge || 0);
    const walletUsed = Number(order.walletUsed || 0);
    const calculated = activeSubtotal - discount + activeShipping + activeTax + codCharge - walletUsed;
    return Math.max(0, Math.round(calculated));
  }, [order, activeSubtotal, activeShipping, activeTax, isLocked]);

  const hasPendingChanges = React.useMemo(() => {
    if (isLocked || !order) return false;
    const shippingChanged = customShipping !== null && customShipping !== Number(order.shipping || 0);
    const pricesChanged = Object.keys(customItemPrices).some((key) => {
      const it = items.find((item: any) => (item.productId || item.sku || item.name) == key);
      return it && customItemPrices[key] !== Number(it.price);
    });
    const quantitiesChanged = Object.keys(customItemQuantities).some((key) => {
      const it = items.find((item: any) => (item.productId || item.sku || item.name) == key);
      return it && customItemQuantities[key] !== Number(it.quantity);
    });

    return shippingChanged || pricesChanged || quantitiesChanged;
  }, [customItemPrices, customItemQuantities, customShipping, order, items, isLocked]);

  function handlePriceChange(itemKey: string | number, newPrice: number) {
    if (isLocked) return;
    setCustomItemPrices((prev) => ({
      ...prev,
      [itemKey]: Math.max(0, newPrice),
    }));
  }

  function handleQuantityChange(itemKey: string | number, newQuantity: number) {
    if (isLocked) return;
    setCustomItemQuantities((prev) => ({
      ...prev,
      [itemKey]: Math.max(1, Math.min(999, Math.floor(newQuantity) || 1)),
    }));
  }

  function handleResetChanges() {
    setCustomItemPrices({});
    setCustomItemQuantities({});
    setCustomShipping(null);
    setIsEditingShipping(false);
    toast.info("Pricing and quantity changes reset");
  }

  async function handleSaveChanges() {
    if (!order || isLocked || !hasPendingChanges) return;
    try {
      setSavingPrices(true);
      await ordersService.updateOrderPricing({
        orderKey: String(order.id || orderKey),
        wooId: order.wooId || null,
        items: activeItems.map((it) => ({
          productId: it.productId || 0,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          total: it.total,
        })),
        shipping: activeShipping,
        subtotal: activeSubtotal,
        tax: activeTax,
        total: activeTotal,
      });

      setCustomItemPrices({});
      setCustomItemQuantities({});
      setCustomShipping(null);
      setIsEditingShipping(false);
      toast.success("Order items and pricing updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update order");
    } finally {
      setSavingPrices(false);
    }
  }

  async function handleTogglePaidStatus(targetStatus: "captured" | "pending") {
    if (!order) return;
    try {
      setUpdatingPaymentStatus(true);
      const orderRef = doc(db, "Orders", String(order.wooId || order.id || orderKey));
      const willBePaid = targetStatus === "captured";

      const updates: any = {
        paymentStatus: targetStatus,
        status: willBePaid ? "processing" : "pending",
        finalized: willBePaid,
        updatedAt: serverTimestamp(),
      };

      if (willBePaid) {
        updates.paidAt = serverTimestamp();
      } else {
        updates.paidAt = null;
      }

      await updateDoc(orderRef, updates).catch(async () => {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(orderRef, {
          wooOrderId: order.wooId || Number(orderKey) || null,
          paymentMethod: order.paymentMethod || "cod",
          total: activeTotal,
          ...updates,
          createdAt: serverTimestamp(),
        });
      });

      toast.success(willBePaid ? "Order marked as Paid" : "Order marked as Payment Pending");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update payment status");
    } finally {
      setUpdatingPaymentStatus(false);
    }
  }

  async function handleGeneratePaymentLink() {
    if (!order || isPaid) return;
    try {
      setGeneratingLink(true);
      const cust = order.customer || {};
      const res = await ordersService.createPaymentLink({
        orderKey: String(order.wooId || order.id || orderKey),
        amount: activeTotal,
        customerName: cust.name || order.address?.name || "Customer",
        customerPhone: cust.phone || order.address?.phone || "",
        customerEmail: cust.email || "",
      });

      const orderRef = doc(db, "Orders", String(order.wooId || order.id || orderKey));
      await updateDoc(orderRef, {
        paymentLinkId: res.paymentLinkId,
        paymentLinkUrl: res.paymentLinkUrl,
        paymentLinkStatus: "created",
        paymentMethod: "razorpay",
        updatedAt: serverTimestamp(),
      }).catch(async () => {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(orderRef, {
          wooOrderId: order.wooId || Number(orderKey) || null,
          paymentLinkId: res.paymentLinkId,
          paymentLinkUrl: res.paymentLinkUrl,
          paymentLinkStatus: "created",
          paymentMethod: "razorpay",
          status: "pending",
          total: activeTotal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      toast.success("Razorpay payment link created and locked!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate payment link");
    } finally {
      setGeneratingLink(false);
    }
  }

  function handleShareWhatsApp(url: string) {
    const phone = order?.customer?.phone || order?.address?.phone;
    if (!phone) {
      toast.error("Customer phone number not available for WhatsApp sharing");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const text = encodeURIComponent(
      `Hello ${order?.customer?.name || order?.address?.name || ""},\n\nPlease complete your payment of ${formatINRStrict(
        activeTotal
      )} for Order #${order.number || order.id || orderKey} using this link:\n${url}\n\nThank you!`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, "_blank");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink />
        <Skeleton className="mb-6 h-8 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink />
        <Card>
          <EmptyState
            icon={error ? AlertTriangle : FileQuestion}
            title="Order not found"
            description={error ?? `No order records found for #${orderKey}`}
          />
        </Card>
      </div>
    );
  }

  const customer = order.customer || {
    name: order.address?.name || "Customer",
    phone: order.address?.phone || "",
    email: order.email || "",
    uid: order.uid || "",
  };

  const shippingAddr = order.shippingAddress || order.address || {};
  const billingAddr = order.billing || order.address || {};
  const createdAtDate = order.createdAt?.toDate
    ? order.createdAt.toDate()
    : order.createdAt
    ? new Date(order.createdAt)
    : null;
  const paidAtDate = order.paidAt?.toDate
    ? order.paidAt.toDate()
    : order.paidAt
    ? new Date(order.paidAt)
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />

      {/* Header Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">#{order.number || order.id || orderKey}</h1>

        <Badge variant={isPaid ? "default" : "secondary"} className="capitalize">
          {order.status || (isPaid ? "processing" : "pending")}
        </Badge>

        {isPaid ? (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1.5 font-medium">
            <CheckCircle2 className="size-3.5" /> Paid
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 gap-1.5 font-medium">
            <Clock className="size-3.5" /> Payment Pending
          </Badge>
        )}

        {isCodOrder && (
          <Badge variant="secondary" className="border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-medium">
            Cash on Delivery · Editable
          </Badge>
        )}

        {createdAtDate && (
          <span className="text-muted-foreground text-sm">
            {formatDateTime(createdAtDate)} · {timeAgo(createdAtDate)}
          </span>
        )}

        <div className="flex-1" />
        {(order.items?.length ?? 0) > 0 && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/orders/new?repeat=${encodeURIComponent(String(order.id || orderKey))}`}>
              <RotateCcw className="mr-1 size-3.5" /> Repeat order
            </Link>
          </Button>
        )}
        {!order.isLegacyWoo && (
          <Button size="sm" asChild>
            <Link href={`/orders/${encodeURIComponent(String(order.id || orderKey))}/invoice`}>
              <FileText className="mr-1 size-3.5" /> Invoice
            </Link>
          </Button>
        )}
        {order.wooId && (
          <Button variant="outline" size="sm" asChild>
            <a href={`${STORE}/wp-admin/post.php?post=${order.wooId}&action=edit`} target="_blank" rel="noreferrer">
              Open in WooCommerce <ExternalLink className="ml-1 size-3.5" />
            </a>
          </Button>
        )}
      </div>

      {/* Unsaved Changes Banner */}
      {!isLocked && hasPendingChanges && (
        <div className="bg-primary/10 border-primary/30 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="text-primary size-4" />
            <span>You have unsaved changes to item quantities, prices, or shipping charges.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleResetChanges} disabled={savingPrices}>
              <RotateCcw className="mr-1 size-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={handleSaveChanges} disabled={savingPrices}>
              {savingPrices ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Save className="mr-1 size-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Locked Notice */}
      {!isPaid && hasLinkGenerated && (
        <div className="bg-muted/40 border-muted-foreground/20 text-muted-foreground mb-6 flex items-center gap-2 rounded-lg border p-3 text-xs">
          <Lock className="size-3.5 shrink-0" />
          <span>Pricing and quantities are locked because an active Razorpay payment link has already been generated.</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Items, Address, Notes */}
        <div className="grid content-start gap-6 lg:col-span-2">
          {/* Items Card */}
          <Card className="gap-0 pb-0">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Items ({activeItems.reduce((acc, it) => acc + it.quantity, 0)})
                </CardTitle>
                {!isLocked && hasPendingChanges && (
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveChanges} disabled={savingPrices}>
                    {savingPrices ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Save className="mr-1 size-3" />} Save Changes
                  </Button>
                )}
              </div>
            </CardHeader>
            <ul className="divide-y">
              {activeItems.map((it, i) => {
                const itemKey = it.productId || it.sku || it.name;
                const isPriceModified = !isLocked && customItemPrices[itemKey] !== undefined && customItemPrices[itemKey] !== it.price;
                const isQtyModified = !isLocked && customItemQuantities[itemKey] !== undefined && customItemQuantities[itemKey] !== it.quantity;

                return (
                  <li key={`${it.productId}-${i}`} className="flex flex-wrap items-center gap-3 px-6 py-3">
                    <ProductThumb src={it.image || null} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                        {it.productId > 0 && <span className="font-mono">#{it.productId}</span>}
                        {it.sku && <span>SKU {it.sku}</span>}
                        {it.salt && <span>· {it.salt}</span>}
                      </div>
                    </div>

                    {/* EDITABLE CONTROLS: PRICE & QUANTITY */}
                    {!isLocked ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Price Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-xs">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label={`Price for ${it.name}`}
                            value={isNaN(it.price) ? "" : it.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handlePriceChange(itemKey, isNaN(val) ? 0 : val);
                            }}
                            className={`h-8 w-18 text-right tabular-nums text-xs ${isPriceModified ? "border-primary bg-primary/5" : ""}`}
                          />
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            aria-label="Decrease quantity"
                            disabled={it.quantity <= 1}
                            onClick={() => handleQuantityChange(itemKey, it.quantity - 1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <Input
                            type="text"
                            inputMode="numeric"
                            aria-label={`Quantity for ${it.name}`}
                            value={it.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
                              handleQuantityChange(itemKey, isNaN(val) ? 1 : val);
                            }}
                            className={`h-8 w-12 text-center tabular-nums text-xs ${isQtyModified ? "border-primary bg-primary/5" : ""}`}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            aria-label="Increase quantity"
                            disabled={it.quantity >= 999}
                            onClick={() => handleQuantityChange(itemKey, it.quantity + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {it.quantity} × {formatINRStrict(it.price)}
                      </div>
                    )}

                    <div className="w-20 text-right text-sm font-medium tabular-nums">
                      {formatINRStrict(it.total)}
                    </div>
                  </li>
                );
              })}
              {activeItems.length === 0 && <li className="text-muted-foreground px-6 py-6 text-sm">No items in this order.</li>}
            </ul>

            {/* Financial Summary */}
            <div className="grid gap-1.5 border-t px-6 py-4 text-sm sm:ml-auto sm:w-80">
              <Row label="Subtotal" value={formatINRStrict(activeSubtotal)} />
              {order.discount > 0 && (
                <Row label="Discount" value={`−${formatINRStrict(order.discount)}`} tone="text-success" />
              )}

              {/* Shipping Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Shipping</span>
                  {!isLocked && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditingShipping((v) => !v)}
                        className="text-primary hover:underline text-xs"
                      >
                        {isEditingShipping ? "Done" : "Change"}
                      </button>
                      {customShipping !== null && (
                        <button
                          type="button"
                          title="Reset shipping"
                          onClick={() => {
                            setCustomShipping(null);
                            setIsEditingShipping(false);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="size-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <span className="tabular-nums">
                  {activeShipping === 0 ? "Free" : formatINRStrict(activeShipping)}
                </span>
              </div>

              {/* Inline Delivery Override Box */}
              {!isLocked && isEditingShipping && (
                <div className="bg-muted/40 my-1 grid gap-2 rounded-lg border p-2.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Custom delivery charge:</span>
                    <button
                      type="button"
                      onClick={() => setCustomShipping(0)}
                      className="text-primary hover:underline text-xs font-normal"
                    >
                      Set Free (₹0)
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder={String(order.shipping || 0)}
                      value={customShipping === null ? "" : customShipping}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCustomShipping(isNaN(val) ? 0 : val);
                      }}
                      className="h-7 text-xs tabular-nums"
                    />
                    {customShipping !== null && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCustomShipping(null)}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {activeTax > 0 && <Row label="Tax (5%)" value={formatINRStrict(activeTax)} />}
              {order.codCharge > 0 && <Row label="COD charge" value={formatINRStrict(order.codCharge)} />}
              {order.walletUsed > 0 && <Row label="Wallet used" value={`−${formatINRStrict(order.walletUsed)}`} tone="text-success" />}
              <div className="my-1 border-t" />
              <Row label={isPaid ? "Paid" : "Payable"} value={formatINRStrict(activeTotal)} strong />
            </div>
          </Card>

          {/* Addresses Card */}
          <Card>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <AddressCard title="Shipping address" a={shippingAddr} />
              <AddressCard title="Billing address" a={billingAddr} />
            </CardContent>
          </Card>

          {/* Notes Card */}
          {(order.note || order.customerNote || wooNotes.length > 0) && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {(order.note || order.customerNote) && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    {order.note || order.customerNote}
                  </div>
                )}
                {wooNotes.map((n: any) => (
                  <div key={n.id} className="border-l-2 pl-3 text-sm">
                    <div>{n.note}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {n.author || "system"} · {n.createdAt ? formatDateTime(new Date(n.createdAt)) : ""}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Customer, Payment, Metadata */}
        <div className="grid content-start gap-6">
          {/* Customer Card */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5 text-sm">
              <div className="font-medium">{customer.name}</div>
              {customer.phone && <div className="text-muted-foreground tabular-nums">{customer.phone}</div>}
              {customer.email && <div className="text-muted-foreground truncate">{customer.email}</div>}
              {order.placedBy && <div className="text-muted-foreground text-xs pt-1">Placed by: {order.placedBy}</div>}
              {customer.uid && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href={customerHref(customer as any)}>
                    <User className="mr-1 size-3.5" /> View customer profile
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium uppercase">{order.paymentMethod || "COD"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Status</span>
                {isPaid ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1.5 font-medium">
                    <CheckCircle2 className="size-3.5" /> Paid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 gap-1.5 font-medium">
                    <Clock className="size-3.5" /> Pending
                  </Badge>
                )}
              </div>

              {paidAtDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid on</span>
                  <span>{formatDateTime(paidAtDate)}</span>
                </div>
              )}

              <CopyValue label="Transaction ID" value={order.razorpayPaymentId || order.transactionId || ""} />
              <CopyValue label="Payment Link ID" value={order.paymentLinkId || ""} />

              {/* Status Update Control Box */}
              <div className="bg-muted/40 grid gap-2 rounded-lg border p-3">
                <span className="font-medium text-xs">Update Payment Status</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={isPaid ? "default" : "outline"}
                    className="h-8 text-xs"
                    disabled={updatingPaymentStatus || isPaid}
                    onClick={() => handleTogglePaidStatus("captured")}
                  >
                    {updatingPaymentStatus && !isPaid ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1 size-3" />
                    )}
                    Mark Paid
                  </Button>
                  <Button
                    size="sm"
                    variant={!isPaid ? "secondary" : "outline"}
                    className="h-8 text-xs"
                    disabled={updatingPaymentStatus || !isPaid}
                    onClick={() => handleTogglePaidStatus("pending")}
                  >
                    {updatingPaymentStatus && isPaid ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Clock className="mr-1 size-3" />
                    )}
                    Mark Pending
                  </Button>
                </div>
              </div>

              {/* Payment Link Management (Active only when unpaid) */}
              {!isPaid && (
                <div className="border-t pt-3">
                  {paymentLinkUrl ? (
                    <div className="bg-primary/5 border-primary/20 grid gap-2.5 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-xs">
                          <Link2 className="text-primary size-3.5" /> Razorpay Payment Link
                        </span>
                        {paymentLinkStatus && (
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">
                            {paymentLinkStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={paymentLinkUrl}
                          className="bg-background min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs tabular-nums select-all"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-7 shrink-0"
                          title="Copy Link"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentLinkUrl);
                            toast.success("Payment link copied");
                          }}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="outline" className="size-7 shrink-0" title="Open Link" asChild>
                          <a href={paymentLinkUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs w-full"
                        onClick={() => handleShareWhatsApp(paymentLinkUrl)}
                      >
                        <Send className="mr-1.5 size-3" /> Share via WhatsApp
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      disabled={generatingLink || hasPendingChanges}
                      onClick={handleGeneratePaymentLink}
                    >
                      {generatingLink ? (
                        <>
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Generating Razorpay Link...
                        </>
                      ) : hasPendingChanges ? (
                        "Save Pricing Before Generating Link"
                      ) : (
                        <>
                          <Link2 className="mr-1.5 size-3.5" /> Generate Payment Link ({formatINRStrict(activeTotal)})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database & Store Reference Metadata */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Database Record</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5 text-sm">
              <CopyValue label="Order / Doc ID" value={String(order.id || orderKey)} />
              {order.wooId && <CopyValue label="WooCommerce ID" value={String(order.wooId)} />}
              {customer.uid && <CopyValue label="Customer UID" value={customer.uid} />}
              {order.isLegacyWoo && (
                <div className="bg-muted/40 text-muted-foreground mt-1 rounded p-2 text-xs">
                  Loaded from WooCommerce (legacy archive).
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
