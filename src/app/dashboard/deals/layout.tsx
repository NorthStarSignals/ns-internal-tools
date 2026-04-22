import AdminGuard from "@/components/AdminGuard";

// Deal Screener is admin-only (acquisition due diligence lives with
// strategy / leadership, not team members).
export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
