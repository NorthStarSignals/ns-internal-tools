"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { truncate } from "@/lib/utils";
import { REQUIREMENT_TYPES } from "@/lib/constants";
import type { KnowledgeBaseEntry } from "@/lib/types";

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    requirement_text: "",
    response_text: "",
    requirement_type: "narrative",
    industry: "",
  });

  const fetchEntries = useCallback(async (q?: string) => {
    try {
      const url = q
        ? `/api/rfp/knowledge-base?q=${encodeURIComponent(q)}`
        : "/api/rfp/knowledge-base";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEntries(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchEntries]);

  function openNewModal() {
    setEditingEntry(null);
    setForm({
      requirement_text: "",
      response_text: "",
      requirement_type: "narrative",
      industry: "",
    });
    setShowModal(true);
  }

  function openEditModal(entry: KnowledgeBaseEntry) {
    setEditingEntry(entry);
    setForm({
      requirement_text: entry.requirement_text,
      response_text: entry.response_text,
      requirement_type: entry.requirement_type || "narrative",
      industry: entry.industry || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.requirement_text.trim() || !form.response_text.trim()) {
      toast.error("Both requirement and response are required");
      return;
    }
    setSaving(true);
    try {
      if (editingEntry) {
        const res = await fetch(
          `/api/rfp/knowledge-base/${editingEntry.entry_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }
        );
        if (!res.ok) throw new Error();
        toast.success("Entry updated");
      } else {
        const res = await fetch("/api/rfp/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success("Entry added");
      }
      setShowModal(false);
      fetchEntries(searchQuery || undefined);
    } catch {
      toast.error("Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    try {
      const res = await fetch(`/api/rfp/knowledge-base/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.entry_id !== entryId));
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  function getWinBadgeVariant(status: string | null) {
    switch (status) {
      case "won":
        return "success";
      case "lost":
        return "critical";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  }

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
        <Link
          href="/dashboard/rfp"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
        >
          <ArrowLeft size={14} />
          Back to RFP Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
            <p className="text-slate-400 mt-1">
              Reusable requirement-response pairs for faster proposals
            </p>
          </div>
          <Button onClick={openNewModal}>
            <Plus size={16} />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-xl text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue"
          placeholder="Search requirements and responses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <BookOpen className="mx-auto text-slate-500 mb-3" size={40} />
          <p className="text-slate-300 font-medium">
            {searchQuery ? "No matching entries" : "Knowledge base is empty"}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Add entries to build your reusable response library"}
          </p>
        </div>
      ) : (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  Requirement
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  Response
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  Industry
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  Win
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  Used
                </th>
                <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {entries.map((entry) => {
                const typeInfo =
                  REQUIREMENT_TYPES[
                    entry.requirement_type as keyof typeof REQUIREMENT_TYPES
                  ];
                return (
                  <tr
                    key={entry.entry_id}
                    className="hover:bg-navy-700/50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-300 max-w-[200px]">
                      {truncate(entry.requirement_text, 80)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 max-w-[250px]">
                      {truncate(entry.response_text, 100)}
                    </td>
                    <td className="px-4 py-3">
                      {typeInfo ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {entry.industry || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.win_status ? (
                        <Badge variant={getWinBadgeVariant(entry.win_status)}>
                          {entry.win_status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {entry.times_used}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-navy-600 text-slate-400 hover:text-white"
                          onClick={() => openEditModal(entry)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-navy-600 text-slate-400 hover:text-red-400"
                          onClick={() => handleDelete(entry.entry_id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingEntry ? "Edit Entry" : "Add Entry"}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Requirement Text
            </label>
            <textarea
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue min-h-[100px] resize-y"
              placeholder="The RFP requirement or question..."
              value={form.requirement_text}
              onChange={(e) =>
                setForm({ ...form, requirement_text: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Response Text
            </label>
            <textarea
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue min-h-[150px] resize-y"
              placeholder="The winning response..."
              value={form.response_text}
              onChange={(e) =>
                setForm({ ...form, response_text: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                Type
              </label>
              <select
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                value={form.requirement_type}
                onChange={(e) =>
                  setForm({ ...form, requirement_type: e.target.value })
                }
              >
                {Object.entries(REQUIREMENT_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Industry"
              placeholder="e.g., Government IT"
              value={form.industry}
              onChange={(e) =>
                setForm({ ...form, industry: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : editingEntry
                ? "Save Changes"
                : "Add Entry"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
