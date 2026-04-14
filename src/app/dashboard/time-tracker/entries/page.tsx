"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface TTUser {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  client: string | null;
}

interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  date: string;
  hours: number;
  notes: string | null;
  status: string;
  tt_users?: { name: string; email: string };
  tt_projects?: { name: string; client: string | null };
}

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="default">Draft</Badge>;
    case "submitted":
      return <Badge variant="note">Submitted</Badge>;
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

type SortKey = "date" | "hours" | "user" | "project" | "status";
type SortDir = "asc" | "desc";

export default function EntriesPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<TTUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(
    monthStart.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);
  const [filterUser, setFilterUser] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (filterUser) params.set("user_id", filterUser);
      if (filterProject) params.set("project_id", filterProject);
      if (filterStatus) params.set("status", filterStatus);

      const [entriesRes, usersRes, projectsRes] = await Promise.all([
        fetch(`/api/time-tracker/entries?${params}`),
        fetch("/api/time-tracker/users"),
        fetch("/api/time-tracker/projects"),
      ]);

      if (entriesRes.ok) setEntries(await entriesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch {
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, filterUser, filterProject, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort entries
  const sortedEntries = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "hours":
        cmp = (a.hours || 0) - (b.hours || 0);
        break;
      case "user":
        cmp = (a.tt_users?.name || "").localeCompare(
          b.tt_users?.name || ""
        );
        break;
      case "project":
        cmp = (a.tt_projects?.name || "").localeCompare(
          b.tt_projects?.name || ""
        );
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} />
    ) : (
      <ChevronDown size={12} />
    );
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === sortedEntries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedEntries.map((e) => e.id)));
    }
  };

  const selectedSubmitted = sortedEntries.filter(
    (e) => selected.has(e.id) && e.status === "submitted"
  );

  const handleApproveSelected = async () => {
    if (selectedSubmitted.length === 0) {
      toast.error("No submitted entries selected");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/time-tracker/entries/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_ids: selectedSubmitted.map((e) => e.id),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} entries approved`);
        setSelected(new Set());
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve entries");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedSubmitted.length === 0) {
      toast.error("No submitted entries selected");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/time-tracker/entries/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_ids: selectedSubmitted.map((e) => e.id),
          action: "reject",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} entries rejected`);
        setSelected(new Set());
        setShowRejectModal(false);
        setRejectNote("");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reject");
      }
    } catch {
      toast.error("Failed to reject entries");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAll = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/time-tracker/entries/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} entries approved`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve all");
    } finally {
      setProcessing(false);
    }
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
            <h1 className="text-2xl font-bold text-white">All Time Entries</h1>
            <p className="text-slate-400 mt-1">
              Review and approve team timesheets
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 && (
            <>
              <Button
                size="sm"
                onClick={handleApproveSelected}
                disabled={processing || selectedSubmitted.length === 0}
              >
                <CheckCircle size={14} />
                Approve Selected ({selectedSubmitted.length})
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={processing || selectedSubmitted.length === 0}
              >
                <XCircle size={14} />
                Reject Selected
              </Button>
            </>
          )}
          <Button
            size="sm"
            className="bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
            onClick={handleApproveAll}
            disabled={processing}
          >
            {processing && <Loader2 size={14} className="animate-spin" />}
            Approve All Submitted
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Team Member
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="">All Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Project
            </label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent-blue" />
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No entries found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selected.size === sortedEntries.length &&
                        sortedEntries.length > 0
                      }
                      onChange={toggleAll}
                      className="rounded bg-navy-900 border-navy-600"
                    />
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase cursor-pointer select-none"
                    onClick={() => toggleSort("user")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Member <SortIcon col="user" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase cursor-pointer select-none"
                    onClick={() => toggleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date <SortIcon col="date" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase cursor-pointer select-none"
                    onClick={() => toggleSort("project")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Project <SortIcon col="project" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase cursor-pointer select-none"
                    onClick={() => toggleSort("hours")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Hours <SortIcon col="hours" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Notes
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase cursor-pointer select-none"
                    onClick={() => toggleSort("status")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Status <SortIcon col="status" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-navy-700/50 hover:bg-navy-700/30"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="rounded bg-navy-900 border-navy-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {entry.tt_users?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {entry.tt_projects?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                      {entry.hours.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-[200px] truncate">
                      {entry.notes || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(entry.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Entries"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Reject {selectedSubmitted.length} submitted entries? They will be
            sent back to draft status for the team to edit.
          </p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Note (optional)
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowRejectModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSelected}
              disabled={processing}
            >
              {processing && <Loader2 size={16} className="animate-spin" />}
              Reject Entries
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
