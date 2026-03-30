import Sidebar from "@/components/dashboard/sidebar";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy-950">
      <Sidebar />
      <main className="lg:ml-64 p-6 pt-16 lg:pt-6">{children}</main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a2342",
            color: "#e2e8f0",
            border: "1px solid #243056",
          },
        }}
      />
    </div>
  );
}
