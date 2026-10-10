import { ClipboardList, PackageSearch, ScanSearch, ShoppingCart, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Not migrated from Flutter yet */
  disabled?: boolean;
};

/** Same destinations as the Flutter NavigationRail (nav/shell.dart). */
export const NAV_ITEMS: NavItem[] = [
  { title: "Products", href: "/products", icon: PackageSearch },
  { title: "Search data", href: "/searchdata", icon: ScanSearch, disabled: true },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Prescriptions", href: "/prescriptions", icon: ClipboardList },
  { title: "Orders", href: "/orders", icon: ShoppingCart, disabled: true },
];
