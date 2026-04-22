"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Archive,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

interface Project {
  id: string;
  name: string;
  client: string | null;
  status: string;
}

interface TimeEntry {
  id: string;
  project_id: string;
  date: string;
  hours: number;
}

function ProjectsPageContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formClient, setFormClient] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, allEntriesRes, monthEntriesRes] = await Promise.all([
        fetch("/api/time-tracker/projects"),
        fetch("/api/time-tracker/entries"),
        fetch(
          `/api/time-tracker/entries?date_from=${monthStart}&date_to=${monthEnd}`
        ),
      ]);
      if (projRes.ok) setProjects(await projRes.json());
      if (allEntriesRes.ok) setEntries(await allEntriesRes.json());
      if (monthEntriesRes.ok) setMonthEntries(await monthEntriesRes.json());
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProjectHoursAll = (projectId: string) =>
    entries
      .filter((e) => e.project_id === projectId)
      .reduce((s, e) => s + (e.hours || 0), 0);

  const getProjectHoursMonth = (projectId: string) =>
    monthEntries
      .filter((e) => e.project_id === projectId)
      .reduce((s, e) => s + (e.hours || 0), 0);

  const openAdd = () => {
    setEditProject(null);
    setFormName("");
    setFormClient("");
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditProject(project);
    setFormName(project.name);
    setFormClient(project.client || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        client: formClient || null,
      };

      const url = editProject
        ? `/api/time-tracker/projects/${editProject.id}`
        : "/api/time-tracker/projects";
      const method = editProject ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editProject ? "Project updated" : "Project created");
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (project: Project) => {
    try {
      const res = await fetch(
        `/api/time-tracker/projects/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "archived" }),
        }
      );
      if (res.ok) {
        toast.success("Project archived");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to archive");
      }
    } catch {
      toast.error("Failed to archive project");
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
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-slate-400 mt-1">
              Manage projects and track hours
            </p>
          </div>
        </div>
        <Button
          className="bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
          onClick={openAdd}
        >
          <Plus size={16} />
          Add Project
        </Button>
      </div>

      {/* Table */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent-blue" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No projects found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Hours (All Time)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Hours (Month)
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-navy-700/50 hover:bg-navy-700/30"
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {project.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {project.client || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          project.status === "active"
                            ? "success"
                            : "default"
                        }
                      >
                        {project.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                      {getProjectHoursAll(project.id).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                      {getProjectHoursMonth(project.id).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(project)}
                        >
                          <Pencil size={14} />
                        </Button>
                        {project.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(project)}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            <Archive size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editProject ? "Edit Project" : "Add Project"}
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Website Redesign"
          />
          <Input
            label="Client"
            value={formClient}
            onChange={(e) => setFormClient(e.target.value)}
            placeholder="e.g. Acme Corp (optional)"
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editProject ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


export default function ProjectsPage() {
  return (
    <AdminGuard>
      <ProjectsPageContent />
    </AdminGuard>
  );
}
