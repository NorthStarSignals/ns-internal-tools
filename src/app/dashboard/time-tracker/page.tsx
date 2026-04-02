"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Play,
  Square,
  FileText,
  DollarSign,
  Users,
  CheckCircle,
  BarChart3,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

interface TTUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  pay_type: string;
  hourly_rate: number | null;
  retainer_amount: number | null;
  status: string;
}

interface Project {
  id: string;
  name: string;
  client: string | null;
  status: string;
}

interface ActiveTimer {
  id: string;
  project_id: string;
  start_time: string;
  tt_projects?: { name: string; client: string | null };
}

interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  date: string;
  hours: number;
  notes: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  tt_users?: { name: string; email: string };
  tt_projects?: { name: string; client: string | null };
}

// ─── TIMER VIEW (Member) ───────────────────────────────────────────────────────

function TimerView({ user }: { user: TTUser }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [showClockOutNotes, setShowClockOutNotes] = useState(false);
  const [clockOutNotes, setClockOutNotes] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry state
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualProject, setManualProject] = useState("");
  const [manualHours, setManualHours] = useState("1");
  const [manualNotes, setManualNotes] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  // Quick stats
  const [weekHours, setWeekHours] = useState(0);
  const [monthHours, setMonthHours] = useState(0);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/time-tracker/projects?active_only=true");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].id);
          setManualProject(data[0].id);
        }
      }
    } catch {
      /* ignore */
    }
  }, [selectedProject]);

  const fetchActiveTimer = useCallback(async () => {
    try {
      const res = await fetch("/api/time-tracker/timer");
      if (res.ok) {
        const data = await res.json();
        if (data.active_timer) {
          setActiveTimer(data.active_timer);
          localStorage.setItem(
            "tt_timer_start",
            data.active_timer.start_time
          );
        } else {
          setActiveTimer(null);
          localStorage.removeItem("tt_timer_start");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const day = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [weekRes, monthRes] = await Promise.all([
        fetch(
          `/api/time-tracker/entries?date_from=${weekStart.toISOString().split("T")[0]}&date_to=${now.toISOString().split("T")[0]}`
        ),
        fetch(
          `/api/time-tracker/entries?date_from=${monthStart.toISOString().split("T")[0]}&date_to=${now.toISOString().split("T")[0]}`
        ),
      ]);

      if (weekRes.ok) {
        const entries: TimeEntry[] = await weekRes.json();
        setWeekHours(
          entries.reduce((s, e) => s + (e.hours || 0), 0)
        );
      }
      if (monthRes.ok) {
        const entries: TimeEntry[] = await monthRes.json();
        setMonthHours(
          entries.reduce((s, e) => s + (e.hours || 0), 0)
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchActiveTimer();
    fetchStats();
  }, [fetchProjects, fetchActiveTimer, fetchStats]);

  // Running timer
  useEffect(() => {
    if (activeTimer?.start_time) {
      const start = new Date(activeTimer.start_time).getTime();
      const tick = () => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeTimer]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleClockIn = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    setClockingIn(true);
    try {
      const res = await fetch("/api/time-tracker/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clock_in",
          project_id: selectedProject,
        }),
      });
      if (res.ok) {
        toast.success("Clocked in!");
        await fetchActiveTimer();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to clock in");
      }
    } catch {
      toast.error("Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeTimer) return;
    setClockingOut(true);
    try {
      const res = await fetch("/api/time-tracker/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clock_out",
          entry_id: activeTimer.id,
          notes: clockOutNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Clocked out!");
        setActiveTimer(null);
        setShowClockOutNotes(false);
        setClockOutNotes("");
        localStorage.removeItem("tt_timer_start");
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to clock out");
      }
    } catch {
      toast.error("Failed to clock out");
    } finally {
      setClockingOut(false);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProject) {
      toast.error("Please select a project");
      return;
    }
    setSubmittingManual(true);
    try {
      const res = await fetch("/api/time-tracker/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: manualProject,
          date: manualDate,
          hours: parseFloat(manualHours),
          notes: manualNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Hours logged!");
        setManualNotes("");
        setManualHours("1");
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to log hours");
      }
    } catch {
      toast.error("Failed to log hours");
    } finally {
      setSubmittingManual(false);
    }
  };

  const timerProjectName =
    activeTimer?.tt_projects?.name ||
    projects.find((p) => p.id === activeTimer?.project_id)?.name ||
    "Project";

  return (
    <div className="space-y-8">
      {/* Header with nav links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Tracker</h1>
          <p className="text-slate-400 mt-1">
            Welcome back, {user.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/time-tracker/my-hours">
            <Button variant="secondary" size="sm">
              <FileText size={16} />
              My Hours
            </Button>
          </Link>
          <Link href="/dashboard/time-tracker/my-pay">
            <Button variant="secondary" size="sm">
              <DollarSign size={16} />
              My Pay
            </Button>
          </Link>
        </div>
      </div>

      {/* Timer Card */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 sm:p-8">
        {!activeTimer ? (
          /* Clock In State */
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <Clock size={48} className="mx-auto text-slate-400 mb-3" />
              <h2 className="text-xl font-semibold text-white">
                Ready to work?
              </h2>
              <p className="text-slate-400 mt-1">
                Select a project and clock in
              </p>
            </div>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full max-w-sm px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.client ? ` (${p.client})` : ""}
                </option>
              ))}
            </select>

            <Button
              size="lg"
              className="bg-accent-amber hover:bg-accent-amber/80 text-black font-bold px-12 py-4 text-lg rounded-xl min-w-[200px]"
              onClick={handleClockIn}
              disabled={clockingIn || !selectedProject}
            >
              {clockingIn ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Play size={20} />
              )}
              Clock In
            </Button>
          </div>
        ) : (
          /* Clocked In State */
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <Badge variant="success" className="mb-3 text-sm px-3 py-1">
                Clocked In
              </Badge>
              <p className="text-slate-400">{timerProjectName}</p>
            </div>

            <div className="text-6xl sm:text-7xl font-mono font-bold text-white tabular-nums tracking-wider">
              {formatElapsed(elapsed)}
            </div>

            {!showClockOutNotes ? (
              <Button
                variant="danger"
                size="lg"
                className="px-12 py-4 text-lg rounded-xl min-w-[200px]"
                onClick={() => setShowClockOutNotes(true)}
              >
                <Square size={20} />
                Clock Out
              </Button>
            ) : (
              <div className="w-full max-w-md space-y-3">
                <textarea
                  value={clockOutNotes}
                  onChange={(e) => setClockOutNotes(e.target.value)}
                  placeholder="What did you work on? (optional)"
                  rows={3}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                />
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setShowClockOutNotes(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={handleClockOut}
                    disabled={clockingOut}
                  >
                    {clockingOut ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Square size={16} />
                    )}
                    Confirm Clock Out
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-slate-400 text-sm">This Week</p>
          <p className="text-2xl font-bold text-white mt-1">
            {weekHours.toFixed(1)}h
          </p>
        </div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-slate-400 text-sm">This Month</p>
          <p className="text-2xl font-bold text-white mt-1">
            {monthHours.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Log Hours Manually
        </h2>
        <form
          onSubmit={handleManualEntry}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Input
            label="Date"
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Project
            </label>
            <select
              value={manualProject}
              onChange={(e) => setManualProject(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
          />
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <Button
              type="submit"
              className="w-full bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
              disabled={submittingManual}
            >
              {submittingManual ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              Log Hours
            </Button>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────────

function AdminDashboard() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<TTUser[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const [dateFrom, setDateFrom] = useState(
    monthStart.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, usersRes] = await Promise.all([
        fetch(
          `/api/time-tracker/entries?date_from=${dateFrom}&date_to=${dateTo}`
        ),
        fetch("/api/time-tracker/users"),
      ]);
      if (entriesRes.ok) setEntries(await entriesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats
  const weekEntries = entries.filter(
    (e) => e.date >= weekStart.toISOString().split("T")[0]
  );
  const totalHoursWeek = weekEntries.reduce(
    (s, e) => s + (e.hours || 0),
    0
  );
  const totalHoursMonth = entries.reduce(
    (s, e) => s + (e.hours || 0),
    0
  );
  const activeContractors = users.filter(
    (u) => u.status === "active" && u.role === "member"
  ).length;
  const pendingApprovals = entries.filter(
    (e) => e.status === "submitted"
  ).length;

  // Estimated payroll
  const estimatedPayroll = users.reduce((total, u) => {
    if (u.pay_type === "hourly") {
      const userHours = entries
        .filter((e) => e.user_id === u.id)
        .reduce((s, e) => s + (e.hours || 0), 0);
      return total + userHours * (u.hourly_rate || 0);
    }
    if (u.pay_type === "retainer") {
      return total + (u.retainer_amount || 0);
    }
    return total;
  }, 0);

  // Hours by project
  const hoursByProject: Record<string, { name: string; hours: number }> = {};
  entries.forEach((e) => {
    const pName = e.tt_projects?.name || "Unknown";
    if (!hoursByProject[pName]) hoursByProject[pName] = { name: pName, hours: 0 };
    hoursByProject[pName].hours += e.hours || 0;
  });
  const projectChartData = Object.values(hoursByProject)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // Hours by contractor
  const hoursByUser: Record<string, { name: string; hours: number }> = {};
  entries.forEach((e) => {
    const uName = e.tt_users?.name || "Unknown";
    if (!hoursByUser[uName]) hoursByUser[uName] = { name: uName, hours: 0 };
    hoursByUser[uName].hours += e.hours || 0;
  });
  const userChartData = Object.values(hoursByUser)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Time Tracker Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Overview of team hours and payroll</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/time-tracker/entries">
            <Button variant="secondary" size="sm">
              <FileText size={16} />
              Entries
            </Button>
          </Link>
          <Link href="/dashboard/time-tracker/contractors">
            <Button variant="secondary" size="sm">
              <Users size={16} />
              Contractors
            </Button>
          </Link>
          <Link href="/dashboard/time-tracker/projects">
            <Button variant="secondary" size="sm">
              <BarChart3 size={16} />
              Projects
            </Button>
          </Link>
          <Link href="/dashboard/time-tracker/pay-reports">
            <Button variant="secondary" size="sm">
              <DollarSign size={16} />
              Pay Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock size={16} />
            <span className="text-sm">Hours This Week</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalHoursWeek.toFixed(1)}
          </p>
        </div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign size={16} />
            <span className="text-sm">Est. Payroll (Month)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(estimatedPayroll)}
          </p>
        </div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Users size={16} />
            <span className="text-sm">Active Contractors</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeContractors}</p>
        </div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <CheckCircle size={16} />
            <span className="text-sm">Pending Approvals</span>
          </div>
          <p className="text-2xl font-bold text-white">{pendingApprovals}</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Update
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours by Project */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Hours by Project
          </h3>
          {projectChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={projectChartData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#243056" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  width={120}
                  tickFormatter={(v: string) =>
                    v.length > 16 ? v.slice(0, 16) + "..." : v
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a2342",
                    border: "1px solid #243056",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}h`, "Hours"]}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">
              No data for selected range
            </p>
          )}
        </div>

        {/* Hours by Contractor */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Hours by Contractor
          </h3>
          {userChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={userChartData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#243056" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  width={120}
                  tickFormatter={(v: string) =>
                    v.length > 16 ? v.slice(0, 16) + "..." : v
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a2342",
                    border: "1px solid #243056",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}h`, "Hours"]}
                />
                <Bar dataKey="hours" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">
              No data for selected range
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function TimeTrackerPage() {
  const [user, setUser] = useState<TTUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/time-tracker/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setNotLinked(false);
        } else if (res.status === 404) {
          setNotLinked(true);
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-accent-blue" />
      </div>
    );
  }

  if (notLinked || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-accent-blue" />
        <h2 className="text-xl font-semibold text-white">
          Linking your account...
        </h2>
        <p className="text-slate-400 text-center max-w-md">
          We are connecting your login to your time tracker profile. If this
          takes more than a few seconds, please contact an administrator to
          ensure your email is registered.
        </p>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  return <TimerView user={user} />;
}
