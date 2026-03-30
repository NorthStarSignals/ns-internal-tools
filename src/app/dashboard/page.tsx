"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Search, Plus, ArrowRight } from "lucide-react";

interface DashboardStats {
  rfp: { active: number; totalRequirements: number; pendingResponses: number };
  deals: { active: number; criticalFlags: number; completed: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    rfp: { active: 0, totalRequirements: 0, pendingResponses: 0 },
    deals: { active: 0, criticalFlags: 0, completed: 0 },
  });

  useEffect(() => {
    // Stats will be populated once API routes are built
    fetch("/api/rfp/projects")
      .then((r) => r.ok ? r.json() : { projects: [] })
      .then((data) => {
        const projects = data.projects || [];
        setStats((s) => ({
          ...s,
          rfp: {
            active: projects.filter((p: { status: string }) => p.status === "active").length,
            totalRequirements: 0,
            pendingResponses: 0,
          },
        }));
      })
      .catch(() => {});

    fetch("/api/deals")
      .then((r) => r.ok ? r.json() : { deals: [] })
      .then((data) => {
        const deals = data.deals || [];
        setStats((s) => ({
          ...s,
          deals: {
            active: deals.filter((d: { status: string }) => ["processing", "review"].includes(d.status)).length,
            criticalFlags: 0,
            completed: deals.filter((d: { status: string }) => d.status === "completed").length,
          },
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">North Star Internal Tools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFP Engine Card */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-blue/20 rounded-lg">
                <FileText className="text-accent-blue" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">RFP Engine</h2>
                <p className="text-sm text-slate-400">Proposal generation at scale</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-navy-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.rfp.active}</p>
              <p className="text-xs text-slate-400">Active Projects</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.rfp.totalRequirements}</p>
              <p className="text-xs text-slate-400">Requirements</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.rfp.pendingResponses}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/rfp"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/80 transition-colors"
            >
              <Plus size={16} />
              New Project
            </Link>
            <Link
              href="/dashboard/rfp"
              className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-slate-300 rounded-lg text-sm hover:bg-navy-600 transition-colors"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Deal Screener Card */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-amber/20 rounded-lg">
                <Search className="text-accent-amber" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Deal Screener</h2>
                <p className="text-sm text-slate-400">Due diligence automation</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-navy-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.deals.active}</p>
              <p className="text-xs text-slate-400">Active Deals</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-accent-red">{stats.deals.criticalFlags}</p>
              <p className="text-xs text-slate-400">Critical Flags</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.deals.completed}</p>
              <p className="text-xs text-slate-400">Completed</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/deals"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-amber text-white rounded-lg text-sm font-medium hover:bg-accent-amber/80 transition-colors"
            >
              <Plus size={16} />
              New Deal
            </Link>
            <Link
              href="/dashboard/deals"
              className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-slate-300 rounded-lg text-sm hover:bg-navy-600 transition-colors"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
