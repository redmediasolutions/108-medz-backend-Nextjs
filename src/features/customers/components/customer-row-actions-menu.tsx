"use client";

import Link from "next/link";
import { MapPin, MoreHorizontal, Package, ShoppingCart, User, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Customer } from "../types";

/** Same actions as the Flutter popup menu: cart, orders, rewards, addresses. */
export function CustomerRowActionsMenu({ customer }: { customer: Customer }) {
  const base = `/customers/${customer.id}`;
  const items = [
    { tab: "orders", label: "View orders", icon: Package },
    { tab: "cart", label: "View cart", icon: ShoppingCart },
    { tab: "addresses", label: "View addresses", icon: MapPin },
    { tab: "rewards", label: "View rewards", icon: Wallet },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={base}>
            <User /> Open profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {items.map(({ tab, label, icon: Icon }) => (
          <DropdownMenuItem key={tab} asChild>
            <Link href={`${base}?tab=${tab}`}>
              <Icon /> {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
