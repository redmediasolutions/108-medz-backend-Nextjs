"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Copy, MapPin, Package, ShoppingCart, UserX, Wallet } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatINRStrict } from "@/lib/format";
import { timeAgo } from "@/lib/time-ago";

import {
  useCustomer,
  useCustomerAddresses,
  useCustomerCart,
  useCustomerOrders,
  useWalletTransactions,
} from "../hooks/use-customer-detail";
import { walletSummary } from "../lib/customer-utils";
import { CustomerAddressesTab } from "./customer-addresses-tab";
import { CustomerAvatar } from "./customer-avatar";
import { CustomerRoleBadge, CustomerTypeBadge } from "./customer-badges";
import { CustomerCartTab } from "./customer-cart-tab";
import { CustomerOrdersTab } from "./customer-orders-tab";
import { CustomerRewardsTab } from "./customer-rewards-tab";

const TABS = ["orders", "cart", "addresses", "rewards"] as const;
type Tab = (typeof TABS)[number];

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2" asChild>
      <Link href="/customers">
        <ArrowLeft /> Customers
      </Link>
    </Button>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="bg-muted-foreground/15 rounded px-1.5 text-[11px] tabular-nums">{n}</span>;
}

export function CustomerDetail({ customerId }: { customerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "orders";

  const { data: c, loading, error } = useCustomer(customerId);
  const orders = useCustomerOrders(c?.authUid);
  const cart = useCustomerCart(c?.authUid);
  const addresses = useCustomerAddresses(c);
  const wallet = useWalletTransactions(c?.id);
  const { available } = walletSummary(wallet.data);

  function setTab(t: string) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink />
        <Skeleton className="mb-6 h-36 w-full rounded-xl" />
        <Skeleton className="mb-4 h-9 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink />
        <Card>
          <EmptyState
            icon={error ? AlertTriangle : UserX}
            title={error ? "Something went wrong" : "Customer not found"}
            description={error?.message ?? "This customer may have been deleted."}
          />
        </Card>
      </div>
    );
  }

  const cartCount = cart.data.reduce((s, i) => s + i.quantity, 0);
  const facts = [
    { label: "Phone", value: c.phone || "-" },
    { label: "Email", value: c.email || "-" },
    { label: "Joined", value: c.createdAt ? `${formatDate(c.createdAt)} · ${timeAgo(c.createdAt)}` : "-" },
    { label: "Profile", value: c.isProfileComplete ? "Complete" : "Incomplete" },
  ];
  const stats = [
    { label: "Orders", value: orders.loading ? "…" : String(orders.data.length), tab: "orders" as Tab },
    { label: "In cart", value: cart.loading ? "…" : String(cartCount), tab: "cart" as Tab },
    { label: "Wallet", value: wallet.loading ? "…" : formatINRStrict(available), tab: "rewards" as Tab },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />

      <Card className="mb-6 gap-5 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start gap-4">
          <CustomerAvatar name={c.name} photoUrl={c.photoUrl} className="size-14 text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{c.name || "Unnamed customer"}</h1>
              <CustomerTypeBadge customer={c} />
              {c.isAdmin && <CustomerRoleBadge customer={c} />}
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(c.authUid).then(() => toast.success("UID copied"))}
              className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 font-mono text-xs"
              title="Copy auth UID"
            >
              {c.authUid} <Copy className="size-3" />
            </button>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            {stats.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setTab(s.tab)}
                className="hover:border-primary/40 rounded-lg border px-3 py-2 text-left transition-colors sm:min-w-28"
              >
                <div className="text-muted-foreground text-xs">{s.label}</div>
                <div className="font-semibold tabular-nums">{s.value}</div>
              </button>
            ))}
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-muted-foreground text-xs font-medium">{f.label}</dt>
              <dd className="mt-0.5 truncate text-sm">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-fit">
          <TabsTrigger value="orders">
            <Package className="hidden sm:block" /> Orders <Count n={orders.data.length} />
          </TabsTrigger>
          <TabsTrigger value="cart">
            <ShoppingCart className="hidden sm:block" /> Cart <Count n={cartCount} />
          </TabsTrigger>
          <TabsTrigger value="addresses">
            <MapPin className="hidden sm:block" /> Addresses <Count n={addresses.data.length} />
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Wallet className="hidden sm:block" /> Rewards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <CustomerOrdersTab orders={orders.data} loading={orders.loading} error={orders.error} />
        </TabsContent>
        <TabsContent value="cart">
          <CustomerCartTab authUid={c.authUid} items={cart.data} loading={cart.loading} error={cart.error} />
        </TabsContent>
        <TabsContent value="addresses">
          <CustomerAddressesTab addresses={addresses.data} loading={addresses.loading} error={addresses.error} />
        </TabsContent>
        <TabsContent value="rewards">
          <CustomerRewardsTab
            userId={c.id}
            customerName={c.name}
            transactions={wallet.data}
            loading={wallet.loading}
            error={wallet.error}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
