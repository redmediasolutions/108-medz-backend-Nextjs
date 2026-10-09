"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-config";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="text-muted-foreground/60 flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm"
              title="Coming soon"
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.title}</span>
              <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">Soon</span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/prescriptions" className="flex h-14 items-center gap-2 px-6">
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
        <Pill className="size-4" />
      </span>
      <span className="font-semibold tracking-tight">108Medz CRM</span>
    </Link>
  );
}

export function AppSidebar() {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-60 shrink-0 border-r md:flex md:flex-col">
      <SidebarBrand />
      <div className="py-2">
        <SidebarNav />
      </div>
    </aside>
  );
}
