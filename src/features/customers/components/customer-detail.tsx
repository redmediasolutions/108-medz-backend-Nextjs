"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Copy,
  CreditCard,
  MapPin,
  Package,
  ShoppingCart,
  UserX,
  Wallet,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerOrders } from "@/features/orders/hooks/use-customer-orders";
import { LinkedIdentitiesCard } from "@/features/pincodes/components/linked-identities-card";
import { useUserPrescriptions } from "@/features/prescriptions/hooks/use-prescriptions";
import { formatDate } from "@/lib/format";

import { useCustomer, useCustomerAddresses, useCustomerCart, useWalletTransactions } from "../hooks/use-customer-detail";
import { walletSummary } from "../lib/customer-utils";
import { CustomerAddressesTab } from "./customer-addresses-tab";
import { CustomerAvatar } from "./customer-avatar";
import { CustomerRoleBadge, CustomerTypeBadge } from "./customer-badges";
import { CustomerCartTab } from "./customer-cart-tab";
import { CustomerInsights } from "./customer-insights";
import { CustomerOrdersPanel } from "./customer-orders-panel";
import { CustomerPaymentsPanel } from "./customer-payments-panel";
import { CustomerPrescriptionsTab } from "./customer-prescriptions-tab";
import { CustomerRewardsTab } from "./customer-rewards-tab";

const TABS = ["orders", "payments", "cart", "addresses", "rewards", "prescriptions"] as const;
type Tab = (typeof TABS)[number];

export function BackToCustomers() {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2" asChild>
      <Link href="/customers">
        <ArrowLeft /> Customers
      </Link>
    </Button>
  );
}

export function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="bg-muted-foreground/15 rounded px-1.5 text-[11px] tabular-nums">{n}</span>;
}

export function useTabParam<T extends string>(tabs: readonly T[], fallback: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab") as T | null;
  const tab: T = raw && tabs.includes(raw) ? raw : fallback;
  function setTab(t: string) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }
  return [tab, setTab] as const;
}

/** Full profile of an app customer: every order (app + WooCommerce), payments, cart, addresses, wallet, prescriptions. */
export function CustomerDetail({ customerId }: { customerId: string }) {
  const [tab, setTab] = useTabParam(TABS, "orders");

  const { data: c, loading, error } = useCustomer(customerId);
  const orders = useCustomerOrders(c ? { uid: c.authUid, phone: c.phone, email: c.email } : null);
  const cart = useCustomerCart(c?.authUid);
  const addresses = useCustomerAddresses(c);
  const wallet = useWalletTransactions(c?.id);
  const prescriptions = useUserPrescriptions(c?.id);
  const { available } = walletSummary(wallet.data);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackToCustomers />
        <Skeleton className="mb-6 h-44 w-full rounded-xl" />
        <Skeleton className="mb-4 h-9 w-96" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackToCustomers />
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
  // Many app users never fill in a name — fall back to the name on their latest order
  const orderName = orders.orders.find((o) => o.customer.name && o.customer.name !== "Unknown")?.customer.name ?? "";
  const displayName = c.name || orderName;
  const facts = [
    { label: "Phone", value: c.phone || "-" },
    { label: "Email", value: c.email || "-" },
    { label: "Joined", value: c.createdAt ? formatDate(c.createdAt) : "-" },
    { label: "Profile", value: c.isProfileComplete ? "Complete" : "Incomplete" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <BackToCustomers />

      <Card className="mb-6 gap-5 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start gap-4">
          <CustomerAvatar name={displayName} photoUrl={c.photoUrl} className="size-14 text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayName || "Unnamed customer"}</h1>
              {!c.name && orderName && (
                <span className="text-muted-foreground text-xs" title="No name on the app profile — taken from their latest order">
                  (from orders)
                </span>
              )}
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
        </div>
        <CustomerInsights
          orders={orders.orders}
          loading={orders.loading}
          wallet={{ value: available, loading: wallet.loading }}
          onSelect={setTab}
        />
        <dl className="grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-muted-foreground text-xs font-medium">{f.label}</dt>
              <dd className="mt-0.5 truncate text-sm">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <LinkedIdentitiesCard orders={orders.orders} ready={!orders.loading} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="orders">
            <Package className="hidden sm:block" /> Orders <Count n={orders.orders.length} />
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="hidden sm:block" /> Payments
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
          <TabsTrigger value="prescriptions">
            <ClipboardList className="hidden sm:block" /> Prescriptions <Count n={prescriptions.data.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <CustomerOrdersPanel orders={orders.orders} loading={orders.loading} appError={orders.appError} wooError={orders.wooError} />
        </TabsContent>
        <TabsContent value="payments">
          <CustomerPaymentsPanel orders={orders.orders} loading={orders.loading} />
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
            customerName={displayName}
            transactions={wallet.data}
            loading={wallet.loading}
            error={wallet.error}
          />
        </TabsContent>
        <TabsContent value="prescriptions">
          <CustomerPrescriptionsTab prescriptions={prescriptions.data} loading={prescriptions.loading} error={prescriptions.error} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
