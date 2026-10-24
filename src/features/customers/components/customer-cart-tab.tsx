"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { formatINRStrict } from "@/lib/format";

import { customersService } from "../services/customers.service";
import type { CartItem } from "../types";

function CartRow({ authUid, item }: { authUid: string; item: CartItem }) {
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);

  async function setQty(q: number) {
    if (q < 1) return setConfirm(true);
    setBusy(true);
    try {
      await customersService.updateCartQuantity(authUid, item.id, q);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update quantity");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <ProductThumb src={item.image || null} className="size-12" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.name}</div>
        {item.contents && <div className="text-muted-foreground truncate text-xs">{item.contents}</div>}
        <div className="text-muted-foreground mt-0.5 text-xs">
          {item.mrp > item.salePrice && <span className="mr-1.5 line-through">{formatINRStrict(item.mrp)}</span>}
          {formatINRStrict(item.salePrice)} each
        </div>
      </div>
      <div className="flex items-center rounded-md border">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => setQty(item.quantity - 1)} disabled={busy} aria-label="Decrease">
          <Minus />
        </Button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">
          {busy ? <Loader2 className="mx-auto size-3.5 animate-spin" /> : item.quantity}
        </span>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => setQty(item.quantity + 1)} disabled={busy} aria-label="Increase">
          <Plus />
        </Button>
      </div>
      <div className="w-20 text-right text-sm font-semibold tabular-nums">{formatINRStrict(item.salePrice * item.quantity)}</div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8"
        onClick={() => setConfirm(true)}
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Remove from cart"
        description={`Remove "${item.name}" from this customer's cart?`}
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          try {
            await customersService.removeCartItem(authUid, item.id);
            toast.success("Removed from cart");
          } catch {
            toast.error("Could not remove item");
          }
        }}
      />
    </li>
  );
}

/** Port of CustomerCartSheet — carts/{authUid}/items, edited live. */
export function CustomerCartTab({
  authUid,
  items,
  loading,
  error,
}: {
  authUid: string;
  items: CartItem[];
  loading: boolean;
  error: Error | null;
}) {
  const [clearOpen, setClearOpen] = React.useState(false);

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertTriangle}
          title="Could not load cart"
          description={
            /permission/i.test(error.message)
              ? "Firestore security rules don't allow admins to read customer carts yet. Update the rules for carts/{uid}/items (see README → Firestore rules)."
              : error.message
          }
        />
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={ShoppingCart} title="Cart is empty" description="Items the customer adds in the app appear here live." />
      </Card>
    );
  }

  const total = items.reduce((s, i) => s + i.salePrice * i.quantity, 0);
  const mrpTotal = items.reduce((s, i) => s + Math.max(i.mrp, i.salePrice) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm">
          <span className="font-medium">{count} item{count === 1 ? "" : "s"}</span>
          <span className="text-muted-foreground"> · changes save instantly to the customer&apos;s cart</span>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setClearOpen(true)}>
          <Trash2 /> Clear cart
        </Button>
      </div>
      <ul className="divide-y">
        {items.map((i) => (
          <CartRow key={i.id} authUid={authUid} item={i} />
        ))}
      </ul>
      <div className="grid gap-1 border-t px-4 py-3 text-sm sm:ml-auto sm:w-72">
        {mrpTotal > total && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">You save</span>
            <span className="text-success tabular-nums">{formatINRStrict(mrpTotal - total)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>Cart total</span>
          <span className="tabular-nums">{formatINRStrict(total)}</span>
        </div>
      </div>
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear cart"
        description="Remove every item from this customer's cart? This can't be undone."
        confirmLabel="Clear cart"
        destructive
        onConfirm={async () => {
          try {
            await customersService.clearCart(authUid);
            toast.success("Cart cleared");
          } catch {
            toast.error("Could not clear cart");
          }
        }}
      />
    </Card>
  );
}
