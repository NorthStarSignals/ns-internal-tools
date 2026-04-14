"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Trash2,
  Pencil,
  Sparkles,
  Calendar,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { formatDate, truncate } from "@/lib/utils";
import { PROJECT_STATUSES, REQUIREMENT_TYPES } from "@/lib/constants";
import type {
  RfpProject,
  RfpDocument,
  RfpRequirement,
  CompanyProfile,
} from "@/lib/types";

type Tab = "documents" | "requirements";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<RfpProject | null>(null);
  const [documents, setDocuments] = useState<RfpDocument[]>([]);
  const [requirements, setRequirements] = useState<RfpRequirement[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [loading, setLoading] = useState(true);

  // Edit requirement state
  const [editingReq, setEditingReq] = useState<RfpRequirement | null>(null);
  const [editReqForm, setEditReqForm] = useState({
    section: "",
    requirement_text: "",
    requirement_type: "narrative" as string,
    word_limit: "",
    page_number: "",
  });

  // Extracting state
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/rfp/projects/${projectId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data.project);
    } catch {
      toast.error("Failed to load project");
    }
  }, [projectId]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rfp/documents?project_id=${projectId}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      toast.error("Failed to load documents");
    }
  }, [projectId]);

  const fetchRequirements = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rfp/requirements?project_id=${projectId}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const reqs = data.requirements || [];
      setRequirements(reqs);
      return reqs;
    } catch {
      toast.error("Failed to load requirements");
      return [];
    }
  }, [projectId]);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/rfp/profiles");
      if (!res.ok) return;
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      await Promise.all([
        fetchProject(),
        fetchDocuments(),
        fetchRequirements(),
        fetchProfiles(),
      ]);
      setLoading(false);
    }
    loadAll();
  }, [fetchProject, fetchDocuments, fetchRequirements, fetchProfiles]);

  async function handleUpload(files: File[]) {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", projectId);

      try {
        const res = await fetch("/api/rfp/documents/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDocuments((prev) => [...prev, data.document]);
        toast.success(`Uploaded ${file.name}`);

        // Auto-trigger extraction
        try {
          await fetch("/api/rfp/requirements/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: data.document.document_id }),
          });
          toast.success(`Extracting requirements from ${file.name}`);
          // Refresh requirements after a short delay
          setTimeout(() => fetchRequirements(), 3000);
        } catch {
          toast.error("Auto-extraction failed");
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }

  async function handleExtractRequirements(documentId: string) {
    setExtractingDocId(documentId);
    try {
      const res = await fetch("/api/rfp/requirements/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Extracting requirements — this may take 30-60 seconds...");
      // Poll for results since extraction happens in background
      const pollInterval = setInterval(async () => {
        const reqs = await fetchRequirements();
        if (reqs && reqs.length > 0) {
          clearInterval(pollInterval);
          setExtractingDocId(null);
          toast.success("Requirements extracted successfully!");
        }
      }, 5000);
      // Stop polling after 90 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setExtractingDocId(null);
      }, 90000);
    } catch {
      toast.error("Failed to extract requirements");
      setExtractingDocId(null);
    }
  }

  async function handleDeleteRequirement(requirementId: string) {
    try {
      const res = await fetch(`/api/rfp/requirements/${requirementId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setRequirements((prev) =>
        prev.filter((r) => r.requirement_id !== requirementId)
      );
      toast.success("Requirement deleted");
    } catch {
      toast.error("Failed to delete requirement");
    }
  }

  async function handleSaveRequirement() {
    if (!editingReq) return;
    try {
      const res = await fetch(
        `/api/rfp/requirements/${editingReq.requirement_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: editReqForm.section || null,
            requirement_text: editReqForm.requirement_text,
            requirement_type: editReqForm.requirement_type,
            word_limit: editReqForm.word_limit
              ? Number(editReqForm.word_limit)
              : null,
            page_number: editReqForm.page_number
              ? Number(editReqForm.page_number)
              : null,
          }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Requirement updated");
      setEditingReq(null);
      fetchRequirements();
    } catch {
      toast.error("Failed to update requirement");
    }
  }

  async function handleProfileChange(profileId: string) {
    try {
      const res = await fetch(`/api/rfp/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId || null,
        }),
      });
      if (!res.ok) throw new Error();
      setProject((prev) =>
        prev ? { ...prev, profile_id: profileId || null } : prev
      );
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  }

  function openEditReq(req: RfpRequirement) {
    setEditingReq(req);
    setEditReqForm({
      section: req.section || "",
      requirement_text: req.requirement_text,
      requirement_type: req.requirement_type,
      word_limit: req.word_limit?.toString() || "",
      page_number: req.page_number?.toString() || "",
    });
  }

  function getProcessingStatusVariant(status: string) {
    switch (status) {
      case "completed":
        return "success";
      case "processing":
        return "note";
      case "failed":
        return "critical";
      default:
        return "warning";
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

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-slate-300">
          Project not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/rfp"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
        >
          <ArrowLeft size={14} />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <Badge
                variant={getStatusBadgeVariant(project.status)}
              >
                {PROJECT_STATUSES[project.status]?.label || project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              {project.client_name && <span>{project.client_name}</span>}
              {project.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Due {formatDate(project.due_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Profile
              </label>
              <select
                className="px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                value={project.profile_id || ""}
                onChange={(e) => handleProfileChange(e.target.value)}
              >
                <option value="">No profile</option>
                {profiles.map((p) => (
                  <option key={p.profile_id} value={p.profile_id}>
                    {p.company_name}
                  </option>
                ))}
              </select>
            </div>
            <Link href={`/dashboard/rfp/${projectId}/responses`}>
              <Button>
                <Sparkles size={16} />
                Generate Responses
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-navy-700">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "documents"
              ? "border-accent-blue text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => setActiveTab("documents")}
        >
          <FileText size={16} />
          Documents
          <span className="text-xs bg-navy-700 px-1.5 py-0.5 rounded">
            {documents.length}
          </span>
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "requirements"
              ? "border-accent-blue text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => setActiveTab("requirements")}
        >
          <ClipboardList size={16} />
          Requirements
          <span className="text-xs bg-navy-700 px-1.5 py-0.5 rounded">
            {requirements.length}
          </span>
        </button>
      </div>

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <FileUpload
            onUpload={handleUpload}
            accept=".pdf"
            multiple
            label="Upload RFP Documents (PDF)"
          />

          {documents.length > 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-xl divide-y divide-navy-700">
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <div>
                      <p className="text-sm text-white font-medium">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {doc.page_count && (
                          <span className="text-xs text-slate-500">
                            {doc.page_count} pages
                          </span>
                        )}
                        <Badge
                          variant={getProcessingStatusVariant(
                            doc.processing_status
                          )}
                        >
                          {doc.processing_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      doc.processing_status !== "completed" ||
                      extractingDocId === doc.document_id
                    }
                    onClick={() =>
                      handleExtractRequirements(doc.document_id)
                    }
                  >
                    {extractingDocId === doc.document_id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    Extract Requirements
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requirements Tab */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {requirements.length} total requirements
            </p>
          </div>

          {requirements.length === 0 ? (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
              <ClipboardList
                className="mx-auto text-slate-500 mb-3"
                size={32}
              />
              <p className="text-slate-300 font-medium">
                No requirements yet
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Upload a document and extract requirements to get started
              </p>
            </div>
          ) : (
            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                      Section
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                      Requirement
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                      Page
                    </th>
                    <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {requirements.map((req) => {
                    const typeInfo =
                      REQUIREMENT_TYPES[
                        req.requirement_type as keyof typeof REQUIREMENT_TYPES
                      ];
                    return (
                      <tr key={req.requirement_id} className="hover:bg-navy-700/50">
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {req.section || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 max-w-md">
                          {truncate(req.requirement_text, 120)}
                        </td>
                        <td className="px-4 py-3">
                          {typeInfo && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}
                            >
                              {typeInfo.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {req.page_number || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 rounded hover:bg-navy-600 text-slate-400 hover:text-white"
                              onClick={() => openEditReq(req)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-navy-600 text-slate-400 hover:text-red-400"
                              onClick={() =>
                                handleDeleteRequirement(req.requirement_id)
                              }
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
        </div>
      )}

      {/* Edit Requirement Modal */}
      <Modal
        open={!!editingReq}
        onClose={() => setEditingReq(null)}
        title="Edit Requirement"
      >
        <div className="space-y-4">
          <Input
            label="Section"
            placeholder="e.g., 3.1 Technical Approach"
            value={editReqForm.section}
            onChange={(e) =>
              setEditReqForm({ ...editReqForm, section: e.target.value })
            }
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Requirement Text
            </label>
            <textarea
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue min-h-[100px] resize-y"
              value={editReqForm.requirement_text}
              onChange={(e) =>
                setEditReqForm({
                  ...editReqForm,
                  requirement_text: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Type
            </label>
            <select
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editReqForm.requirement_type}
              onChange={(e) =>
                setEditReqForm({
                  ...editReqForm,
                  requirement_type: e.target.value,
                })
              }
            >
              {Object.entries(REQUIREMENT_TYPES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Word Limit"
              type="number"
              placeholder="Optional"
              value={editReqForm.word_limit}
              onChange={(e) =>
                setEditReqForm({ ...editReqForm, word_limit: e.target.value })
              }
            />
            <Input
              label="Page Number"
              type="number"
              placeholder="Optional"
              value={editReqForm.page_number}
              onChange={(e) =>
                setEditReqForm({
                  ...editReqForm,
                  page_number: e.target.value,
                })
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditingReq(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRequirement}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
