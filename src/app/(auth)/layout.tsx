export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-muted/40 relative flex min-h-svh items-center justify-center p-4">
      {children}
    </main>
  );
}
