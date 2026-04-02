"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Pencil,
  Trash2,
  Send,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

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

export default function MyHoursPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(
    monthStart.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);
  const [filterProject, setFilterProject] = useState("");

  // Edit modal
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editProject, setEditProject] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Submit confirmation
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (filterProject) params.set("project_id", filterProject);

      const res = await fetch(`/api/time-tracker/entries?${params}`);
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch {
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, filterProject]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/time-tracker/projects?active_only=true");
      if (res.ok) setProjects(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const draftEntries = entries.filter((e) => e.status === "draft");
  const draftTotal = draftEntries.reduce((s, e) => s + (e.hours || 0), 0);

  const handleSubmitTimesheet = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/time-tracker/entries/submit", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} entries submitted`);
        setShowSubmitConfirm(false);
        fetchEntries();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit");
      }
    } catch {
      toast.error("Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditEntry(entry);
    setEditHours(entry.hours.toString());
    setEditNotes(entry.notes || "");
    setEditDate(entry.date);
    setEditProject(entry.project_id);
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/time-tracker/entries/${editEntry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hours: parseFloat(editHours),
            notes: editNotes || null,
            date: editDate,
            project_id: editProject,
          }),
        }
      );
      if (res.ok) {
        toast.success("Entry updated");
        setEditEntry(null);
        fetchEntries();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/time-tracker/entries/${deleteEntry.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Entry deleted");
        setDeleteEntry(null);
        fetchEntries();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setDeleting(false);
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
            <h1 className="text-2xl font-bold text-white">My Hours</h1>
            <p className="text-slate-400 mt-1">
              View and manage your time entries
            </p>
          </div>
        </div>
        {draftEntries.length > 0 && (
          <Button
            className="bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
            onClick={() => setShowSubmitConfirm(true)}
          >
            <Send size={16} />
            Submit Timesheet ({draftEntries.length})
          </Button>
        )}
      </div>

      {/* Filters */}
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
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent-blue" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No time entries found for this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Project
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Hours
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Notes
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-navy-700/50 hover:bg-navy-700/30"
                  >
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {entry.tt_projects?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                      {entry.hours.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-[200px] truncate">
                      {entry.notes || "-"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(entry.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.status === "draft" && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteEntry(entry)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-navy-600">
                  <td className="px-4 py-3 text-sm font-semibold text-white">
                    Total
                  </td>
                  <td />
                  <td className="px-4 py-3 text-sm font-semibold text-white font-mono">
                    {entries
                      .reduce((s, e) => s + (e.hours || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Edit Time Entry"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Project
            </label>
            <select
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
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
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Notes
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setEditEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        title="Delete Entry"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete this entry? This action cannot be
            undone.
          </p>
          {deleteEntry && (
            <div className="bg-navy-900 rounded-lg p-3 text-sm text-slate-400">
              {formatDate(deleteEntry.date)} &mdash;{" "}
              {deleteEntry.tt_projects?.name || "Unknown"} &mdash;{" "}
              {deleteEntry.hours}h
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setDeleteEntry(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 size={16} className="animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit Timesheet"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Submit {draftEntries.length} entries totaling{" "}
            {draftTotal.toFixed(1)} hours? You won&apos;t be able to edit these
            after submission.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowSubmitConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
              onClick={handleSubmitTimesheet}
              disabled={submitting}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
