"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  FileText,
  Building2,
  BookOpen,
  Search,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Menu,
  X,
} from "lucide-react";

const rfpLinks = [
  { href: "/dashboard/rfp", label: "Projects", icon: FileText },
  { href: "/dashboard/rfp/profiles", label: "Company Profiles", icon: Building2 },
  { href: "/dashboard/rfp/knowledge-base", label: "Knowledge Base", icon: BookOpen },
];

const dealLinks = [
  { href: "/dashboard/deals", label: "Deals", icon: Search },
  { href: "/dashboard/deals/benchmarks", label: "Benchmarks", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-navy-700 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-white">North Star</h1>
            <p className="text-xs text-slate-400">Internal Tools</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1 rounded hover:bg-navy-700 text-slate-400"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        <div>
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === "/dashboard"
                ? "bg-accent-blue/20 text-accent-blue"
                : "text-slate-300 hover:bg-navy-700 hover:text-white"
            )}
          >
            <LayoutDashboard size={18} />
            {!collapsed && "Dashboard"}
          </Link>
        </div>

        <div>
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              RFP Engine
            </p>
          )}
          {rfpLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith(link.href) &&
                  (link.href === "/dashboard/rfp"
                    ? pathname === "/dashboard/rfp" || pathname.startsWith("/dashboard/rfp/") && !pathname.startsWith("/dashboard/rfp/profiles") && !pathname.startsWith("/dashboard/rfp/knowledge-base")
                    : true)
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-slate-300 hover:bg-navy-700 hover:text-white"
              )}
            >
              <link.icon size={18} />
              {!collapsed && link.label}
            </Link>
          ))}
        </div>

        <div>
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Deal Screener
            </p>
          )}
          {dealLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith(link.href) &&
                  (link.href === "/dashboard/deals"
                    ? pathname === "/dashboard/deals" || (pathname.startsWith("/dashboard/deals/") && !pathname.startsWith("/dashboard/deals/benchmarks"))
                    : true)
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-slate-300 hover:bg-navy-700 hover:text-white"
              )}
            >
              <link.icon size={18} />
              {!collapsed && link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-navy-700 space-y-2">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-accent-blue/20 text-accent-blue"
              : "text-slate-300 hover:bg-navy-700 hover:text-white"
          )}
        >
          <Settings size={18} />
          {!collapsed && "Settings"}
        </Link>
        <div className="px-3 py-2">
          <UserButton />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-navy-800 rounded-lg border border-navy-700"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-navy-800 border-r border-navy-700 z-40 transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
