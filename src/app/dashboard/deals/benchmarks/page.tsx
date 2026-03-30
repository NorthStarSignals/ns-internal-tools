"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Info } from "lucide-react";
import type { DealBenchmark } from "@/lib/types";

interface BenchmarkRow {
  deal_id: string;
  deal_name: string;
  metrics: Record<string, number | null>;
}

export default function BenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<DealBenchmark[]>([]);
  const [deals, setDeals] = useState<BenchmarkRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  async function fetchBenchmarks() {
    try {
      const res = await fetch("/api/deals/benchmark");
      if (!res.ok) throw new Error("Failed to fetch benchmarks");
      const data = await res.json();
      setBenchmarks(data.benchmarks || []);
      setDeals(data.deals || []);
    } catch {
      toast.error("Failed to load benchmarks");
    } finally {
      setLoading(false);
    }
  }

  // Gather unique metric names from benchmarks
  const metricNames = Array.from(new Set(benchmarks.map((b) => b.metric_name)));

  // Build chart data per metric
  const chartDataByMetric: Record<string, { name: string; deal: number; median: number }[]> = {};
  metricNames.forEach((metric) => {
    const items = benchmarks.filter((b) => b.metric_name === metric);
    chartDataByMetric[metric] = items.map((b) => ({
      name: `Deal ${b.deal_id.slice(0, 6)}`,
      deal: b.deal_value ?? 0,
      median: b.benchmark_median ?? 0,
    }));
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-slate-300">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deal Benchmarks</h1>
        <p className="text-slate-400 mt-1">
          Compare financial metrics across completed deals
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-300 text-sm font-medium">
            Available after 10+ completed deals
          </p>
          <p className="text-blue-300/70 text-sm mt-1">
            Benchmarks become more reliable with a larger dataset. Continue screening deals to unlock cross-deal insights.
          </p>
        </div>
      </div>

      {deals.length > 0 ? (
        <>
          {/* Deals comparison table */}
          <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                      Deal
                    </th>
                    {metricNames.map((m) => (
                      <th
                        key={m}
                        className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase"
                      >
                        {m.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr
                      key={deal.deal_id}
                      className="border-b border-navy-700/50 hover:bg-navy-700/30"
                    >
                      <td className="px-4 py-3 text-slate-200 font-medium">
                        {deal.deal_name}
                      </td>
                      {metricNames.map((m) => (
                        <td key={m} className="px-4 py-3 text-right text-slate-300">
                          {deal.metrics[m] != null
                            ? formatCurrency(deal.metrics[m]!)
                            : "--"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts per metric */}
          {metricNames.map((metric) => {
            const data = chartDataByMetric[metric];
            if (!data || data.length === 0) return null;
            return (
              <div
                key={metric}
                className="bg-navy-800 border border-navy-700 rounded-xl p-6"
              >
                <h3 className="text-white font-semibold mb-4 capitalize">
                  {metric.replace(/_/g, " ")} Comparison
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#243056" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a2342",
                          border: "1px solid #243056",
                          borderRadius: "8px",
                          color: "#e2e8f0",
                        }}
                        formatter={(value) => [formatCurrency(Number(value))]}
                      />
                      <Bar dataKey="deal" name="Deal Value" fill="#d4a843" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="median" name="Median" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <BarChart3 className="mx-auto text-slate-500 mb-3" size={40} />
          <p className="text-slate-300 font-medium">No benchmark data yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Complete more deals to generate cross-deal benchmarks
          </p>
        </div>
      )}
    </div>
  );
}
