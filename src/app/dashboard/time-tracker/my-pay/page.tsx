"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  DollarSign,
  ArrowLeft,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface TTUser {
  id: string;
  name: string;
  role: string;
  pay_type: string;
  hourly_rate: number | null;
  retainer_amount: number | null;
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  status: string;
}

interface MonthSummary {
  label: string;
  hours: number;
  pay: number;
}

export default function MyPayPage() {
  const [user, setUser] = useState<TTUser | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get last 6 months of entries + user profile
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateFrom = new Date(
        sixMonthsAgo.getFullYear(),
        sixMonthsAgo.getMonth(),
        1
      )
        .toISOString()
        .split("T")[0];

      const [meRes, entriesRes] = await Promise.all([
        fetch("/api/time-tracker/me"),
        fetch(`/api/time-tracker/entries?date_from=${dateFrom}`),
      ]);

      if (meRes.ok) setUser(await meRes.json());
      if (entriesRes.ok) setEntries(await entriesRes.json());
    } catch {
      toast.error("Failed to load pay data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-accent-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-500">
        Could not load profile
      </div>
    );
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const thisMonthEntries = entries.filter(
    (e) => e.date >= currentMonthStart && e.date <= currentMonthEnd
  );
  const thisMonthHours = thisMonthEntries.reduce(
    (s, e) => s + (e.hours || 0),
    0
  );
  const allTimeHours = entries.reduce((s, e) => s + (e.hours || 0), 0);

  const calcPay = (hours: number) => {
    if (user.pay_type === "hourly") {
      return hours * (user.hourly_rate || 0);
    }
    if (user.pay_type === "retainer") {
      return user.retainer_amount || 0;
    }
    return 0;
  };

  const thisMonthPay = calcPay(thisMonthHours);

  // Build last 6 months summary
  const monthSummaries: MonthSummary[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = d.toISOString().split("T")[0];
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const mEntries = entries.filter(
      (e) => e.date >= mStart && e.date <= mEnd
    );
    const mHours = mEntries.reduce((s, e) => s + (e.hours || 0), 0);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    monthSummaries.push({
      label,
      hours: mHours,
      pay: calcPay(mHours),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/time-tracker">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">My Pay</h1>
          <p className="text-slate-400 mt-1">
            {user.pay_type === "hourly"
              ? `Hourly rate: ${formatCurrency(user.hourly_rate || 0)}/hr`
              : user.pay_type === "retainer"
                ? `Retainer: ${formatCurrency(user.retainer_amount || 0)}/mo`
                : "Milestone-based"}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock size={16} />
            <span className="text-sm">Hours This Month</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {thisMonthHours.toFixed(1)}
          </p>
        </div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign size={16} />
            <span className="text-sm">Est. Pay This Month</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(thisMonthPay)}
          </p>
        </div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">Total Hours (6 Months)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {allTimeHours.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">
            Monthly Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                  Month
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                  Total Hours
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                  Estimated Pay
                </th>
              </tr>
            </thead>
            <tbody>
              {monthSummaries.map((m) => (
                <tr
                  key={m.label}
                  className="border-b border-navy-700/50 hover:bg-navy-700/30"
                >
                  <td className="px-6 py-3 text-sm text-white">{m.label}</td>
                  <td className="px-6 py-3 text-sm text-slate-300 font-mono">
                    {m.hours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-300">
                    {user.pay_type === "milestone"
                      ? "Milestone"
                      : formatCurrency(m.pay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
