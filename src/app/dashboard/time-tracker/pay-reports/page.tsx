"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface PayReportRow {
  user_name: string;
  pay_type: string;
  total_hours: number;
  rate: number | null;
  total_pay: number | null;
}

interface PayReportData {
  start_date: string;
  end_date: string;
  report: PayReportRow[];
  grand_total: number;
}

export default function PayReportsPage() {
  const [report, setReport] = useState<PayReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [dateFrom, setDateFrom] = useState(defaultStart);
  const [dateTo, setDateTo] = useState(defaultEnd);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/time-tracker/pay-report?start_date=${dateFrom}&end_date=${dateTo}`
      );
      if (res.ok) {
        setReport(await res.json());
      } else {
        toast.error("Failed to load pay report");
      }
    } catch {
      toast.error("Failed to load pay report");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    const url = `/api/time-tracker/pay-report?start_date=${dateFrom}&end_date=${dateTo}&format=csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `pay-report-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("CSV download started");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/time-tracker">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Pay Reports</h1>
            <p className="text-slate-400 mt-1">
              Team pay summary and CSV export
            </p>
          </div>
        </div>
        <Button
          className="bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
          onClick={handleExportCSV}
        >
          <Download size={16} />
          Export to CSV
        </Button>
      </div>

      {/* Date Range */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button onClick={fetchReport} disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Update
          </Button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent-blue" />
          </div>
        ) : !report || report.report.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No data for this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                    Pay Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                    Total Hours
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                    Rate
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">
                    Total Pay
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.report.map((row) => (
                  <tr
                    key={row.user_name}
                    className="border-b border-navy-700/50 hover:bg-navy-700/30"
                  >
                    <td className="px-6 py-3 text-sm text-white font-medium">
                      {row.user_name}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300 capitalize">
                      {row.pay_type}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300 font-mono">
                      {row.total_hours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {row.pay_type === "hourly" && row.rate !== null
                        ? `${formatCurrency(row.rate)}/hr`
                        : row.pay_type === "retainer" && row.rate !== null
                          ? `${formatCurrency(row.rate)}/mo`
                          : "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-white font-medium">
                      {row.pay_type === "milestone"
                        ? "Milestone"
                        : row.total_pay !== null
                          ? formatCurrency(row.total_pay)
                          : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-600 bg-navy-900/50">
                  <td className="px-6 py-4 text-sm font-bold text-white">
                    Total
                  </td>
                  <td />
                  <td className="px-6 py-4 text-sm font-bold text-white font-mono">
                    {report.report
                      .reduce((s, r) => s + r.total_hours, 0)
                      .toFixed(1)}
                    h
                  </td>
                  <td />
                  <td className="px-6 py-4 text-sm font-bold text-white">
                    {formatCurrency(report.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
