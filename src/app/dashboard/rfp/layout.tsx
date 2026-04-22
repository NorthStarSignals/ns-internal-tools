import AdminGuard from "@/components/AdminGuard";

// All RFP Engine pages are admin-only (Malik's sales/strategy tools,
// not team-work surfaces).
export default function RFPLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
