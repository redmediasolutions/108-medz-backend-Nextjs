import Link from "next/link";
import { Mail, Phone, Smartphone, User } from "lucide-react";

import { cn } from "@/lib/utils";

const chip =
  "bg-muted hover:bg-accent inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors";

export function PhoneChip({ phone, className }: { phone: string; className?: string }) {
  return (
    <Link href={`/customers/lookup?phone=${phone}`} className={cn(chip, "tabular-nums", className)} title="Open profile for this number">
      <Phone className="text-muted-foreground size-3" />
      {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
    </Link>
  );
}

export function AccountChip({ uid, className }: { uid: string; className?: string }) {
  return (
    <Link href={`/customers/lookup?uid=${uid}`} className={cn(chip, className)} title={`App account ${uid}`}>
      <Smartphone className="text-muted-foreground size-3" />
      App account <span className="text-muted-foreground font-mono">{uid.slice(0, 6)}…</span>
    </Link>
  );
}

export function EmailChip({ email, className }: { email: string; className?: string }) {
  return (
    <Link href={`/customers/lookup?email=${encodeURIComponent(email)}`} className={cn(chip, className)}>
      <Mail className="text-muted-foreground size-3" />
      <span className="truncate">{email}</span>
    </Link>
  );
}

export function NameChip({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn(chip, "hover:bg-muted cursor-default", className)}>
      <User className="text-muted-foreground size-3" />
      {name}
    </span>
  );
}
