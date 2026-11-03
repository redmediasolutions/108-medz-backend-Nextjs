import { AuthGuard } from "@/components/auth/auth-guard";

/** Full-page, sidebar-free pages meant for printing (invoices). Admin sign-in still required. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
