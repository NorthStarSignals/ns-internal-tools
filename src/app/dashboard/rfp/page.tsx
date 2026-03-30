"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Calendar,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { RfpProject, CompanyProfile } from "@/lib/types";

const CONTRACT_TYPES = [
  { value: "government", label: "Government" },
  { value: "enterprise", label: "Enterprise" },
];

export default function RfpProjectsPage() {
  const [projects, setProjects] = useState<RfpProject[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_name: "",
    industry: "",
    contract_type: "government",
    due_date: "",
    profile_id: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchProfiles();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/rfp/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfiles() {
    try {
      const res = await fetch("/api/rfp/profiles");
      if (!res.ok) return;
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      // Profiles are optional for the dropdown
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/rfp/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      setProjects((prev) => [data.project, ...prev]);
      setShowNewModal(false);
      setForm({
        name: "",
        client_name: "",
        industry: "",
        contract_type: "government",
        due_date: "",
        profile_id: "",
      });
      toast.success("Project created");
    } catch {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "active":
        return "note";
      case "submitted":
        return "default";
      case "won":
        return "success";
      case "lost":
        return "critical";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">RFP Projects</h1>
          <p className="text-slate-400 mt-1">
            Manage your proposals and RFP responses
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <FolderOpen className="mx-auto text-slate-500 mb-3" size={40} />
          <p className="text-slate-300 font-medium">No projects yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create your first RFP project to get started
          </p>
          <Button className="mt-4" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.project_id}
              href={`/dashboard/rfp/${project.project_id}`}
              className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-navy-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-semibold group-hover:text-accent-blue transition-colors">
                  {project.name}
                </h3>
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {PROJECT_STATUSES[project.status]?.label || project.status}
                </Badge>
              </div>

              {project.client_name && (
                <p className="text-slate-400 text-sm mb-4">
                  {project.client_name}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {project.due_date && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={14} />
                    <span>Due {formatDate(project.due_date)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <ClipboardList size={14} />
                  <span>
                    {project.requirement_count ?? 0} requirements
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle2 size={14} />
                  <span>
                    {project.approved_count ?? 0} / {project.response_count ?? 0}{" "}
                    responses approved
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New RFP Project"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g., City of Austin IT Services RFP"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Client Name"
            placeholder="e.g., City of Austin"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />
          <Input
            label="Industry"
            placeholder="e.g., Government IT"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Contract Type
            </label>
            <select
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue"
              value={form.contract_type}
              onChange={(e) =>
                setForm({ ...form, contract_type: e.target.value })
              }
            >
              {CONTRACT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Company Profile
            </label>
            <select
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue"
              value={form.profile_id}
              onChange={(e) =>
                setForm({ ...form, profile_id: e.target.value })
              }
            >
              <option value="">Select a profile (optional)</option>
              {profiles.map((p) => (
                <option key={p.profile_id} value={p.profile_id}>
                  {p.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowNewModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
