"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Download,
  CheckCircle2,
  Trophy,
  Loader2,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { truncate } from "@/lib/utils";
import {
  REQUIREMENT_TYPES,
  RESPONSE_STATUSES,
} from "@/lib/constants";
import type { RfpRequirement, RfpResponse, RfpProject } from "@/lib/types";

export default function ResponsesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<RfpProject | null>(null);
  const [requirements, setRequirements] = useState<RfpRequirement[]>([]);
  const [responses, setResponses] = useState<RfpResponse[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Editable response state
  const [editedText, setEditedText] = useState("");
  const [editedStatus, setEditedStatus] = useState("draft");

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/rfp/projects/${projectId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data.project);
    } catch {
      // handled by loading state
    }
  }, [projectId]);

  const fetchRequirements = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rfp/requirements?project_id=${projectId}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequirements(data.requirements || []);
    } catch {
      toast.error("Failed to load requirements");
    }
  }, [projectId]);

  const fetchResponses = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rfp/responses?project_id=${projectId}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResponses(data.responses || []);
    } catch {
      toast.error("Failed to load responses");
    }
  }, [projectId]);

  useEffect(() => {
    async function loadAll() {
      await Promise.all([
        fetchProject(),
        fetchRequirements(),
        fetchResponses(),
      ]);
      setLoading(false);
    }
    loadAll();
  }, [fetchProject, fetchRequirements, fetchResponses]);

  // When requirements load, auto-select the first one
  useEffect(() => {
    if (requirements.length > 0 && !selectedReqId) {
      setSelectedReqId(requirements[0].requirement_id);
    }
  }, [requirements, selectedReqId]);

  // When selection changes, load the response into the editor
  useEffect(() => {
    if (!selectedReqId) return;
    const resp = responses.find((r) => r.requirement_id === selectedReqId);
    setEditedText(resp?.edited_text || resp?.draft_text || "");
    setEditedStatus(resp?.status || "draft");
  }, [selectedReqId, responses]);

  const selectedReq = requirements.find(
    (r) => r.requirement_id === selectedReqId
  );
  const selectedResp = responses.find(
    (r) => r.requirement_id === selectedReqId
  );

  // Group requirements by section
  const sections = requirements.reduce<Record<string, RfpRequirement[]>>(
    (acc, req) => {
      const section = req.section || "Unsorted";
      if (!acc[section]) acc[section] = [];
      acc[section].push(req);
      return acc;
    },
    {}
  );

  const approvedCount = responses.filter((r) => r.status === "approved").length;
  const totalResponses = responses.length;
  const progressPercent =
    requirements.length > 0
      ? Math.round((approvedCount / requirements.length) * 100)
      : 0;

  function getResponseForReq(reqId: string) {
    return responses.find((r) => r.requirement_id === reqId);
  }

  async function handleSave() {
    if (!selectedResp) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/rfp/responses/${selectedResp.response_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            edited_text: editedText,
            status: editedStatus,
          }),
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResponses((prev) =>
        prev.map((r) =>
          r.response_id === selectedResp.response_id
            ? { ...r, ...data.response }
            : r
        )
      );
      toast.success("Response saved");
    } catch {
      toast.error("Failed to save response");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    try {
      const res = await fetch("/api/rfp/responses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Generating responses for all requirements...");
      // Poll for updates
      setTimeout(() => fetchResponses(), 5000);
      setTimeout(() => fetchResponses(), 15000);
    } catch {
      toast.error("Failed to generate responses");
    } finally {
      setGeneratingAll(false);
    }
  }

  async function handleRegenerate(requirementId: string) {
    setRegeneratingId(requirementId);
    try {
      const res = await fetch("/api/rfp/responses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          requirement_id: requirementId,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Regenerating response...");
      setTimeout(() => fetchResponses(), 5000);
    } catch {
      toast.error("Failed to regenerate response");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/rfp/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "proposal"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Proposal exported");
    } catch {
      toast.error("Failed to export proposal");
    } finally {
      setExporting(false);
    }
  }

  async function handleComplete(outcome: "won" | "lost") {
    setCompleting(true);
    try {
      const res = await fetch(`/api/rfp/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: outcome }),
      });
      if (!res.ok) throw new Error();
      setProject((prev) => (prev ? { ...prev, status: outcome } : prev));
      setShowCompleteModal(false);
      toast.success(
        outcome === "won" ? "Project marked as won!" : "Project marked as lost"
      );
    } catch {
      toast.error("Failed to update project status");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-slate-300">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/rfp/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-3"
        >
          <ArrowLeft size={14} />
          Back to Project
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            {project?.name} - Responses
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleGenerateAll}
              disabled={generatingAll}
            >
              {generatingAll ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Generate All
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export Proposal
            </Button>
            <Button onClick={() => setShowCompleteModal(true)}>
              <Trophy size={16} />
              Complete Project
            </Button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">
            {approvedCount} of {requirements.length} responses approved
          </span>
          <span className="text-sm font-medium text-white">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-navy-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Split layout */}
      <div className="flex gap-4 h-[calc(100vh-280px)]">
        {/* Left panel - requirements list */}
        <div className="w-[380px] flex-shrink-0 bg-navy-800 border border-navy-700 rounded-xl overflow-y-auto">
          {Object.entries(sections).map(([section, reqs]) => (
            <div key={section}>
              <div className="px-4 py-2 bg-navy-900/50 border-b border-navy-700">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section}
                </p>
              </div>
              {reqs.map((req) => {
                const resp = getResponseForReq(req.requirement_id);
                const isSelected =
                  selectedReqId === req.requirement_id;
                const typeInfo =
                  REQUIREMENT_TYPES[
                    req.requirement_type as keyof typeof REQUIREMENT_TYPES
                  ];
                const statusInfo = resp
                  ? RESPONSE_STATUSES[
                      resp.status as keyof typeof RESPONSE_STATUSES
                    ]
                  : null;

                return (
                  <button
                    key={req.requirement_id}
                    className={`w-full text-left px-4 py-3 border-b border-navy-700 transition-colors ${
                      isSelected
                        ? "bg-accent-blue/10 border-l-2 border-l-accent-blue"
                        : "hover:bg-navy-700/50"
                    }`}
                    onClick={() => setSelectedReqId(req.requirement_id)}
                  >
                    <p className="text-sm text-slate-200 mb-1.5">
                      {truncate(req.requirement_text, 80)}
                    </p>
                    <div className="flex items-center gap-2">
                      {typeInfo && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      )}
                      {statusInfo ? (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-navy-700 text-slate-500">
                          No response
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right panel - response editor */}
        <div className="flex-1 bg-navy-800 border border-navy-700 rounded-xl overflow-y-auto">
          {selectedReq ? (
            <div className="p-6 space-y-6">
              {/* Requirement display */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Requirement
                  </h3>
                  {selectedReq.word_limit && (
                    <span className="text-xs text-slate-500">
                      (max {selectedReq.word_limit} words)
                    </span>
                  )}
                </div>
                <p className="text-slate-200 text-sm leading-relaxed bg-navy-900 rounded-lg p-4">
                  {selectedReq.requirement_text}
                </p>
              </div>

              {/* Response editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Response
                  </h3>
                  <div className="flex items-center gap-3">
                    <select
                      className="px-2 py-1 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value)}
                    >
                      {Object.entries(RESPONSE_STATUSES).map(
                        ([key, val]) => (
                          <option key={key} value={key}>
                            {val.label}
                          </option>
                        )
                      )}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        regeneratingId === selectedReq.requirement_id
                      }
                      onClick={() =>
                        handleRegenerate(selectedReq.requirement_id)
                      }
                    >
                      {regeneratingId ===
                      selectedReq.requirement_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      Regenerate
                    </Button>
                  </div>
                </div>
                <textarea
                  className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue resize-y min-h-[300px]"
                  placeholder="Response text will appear here after generation..."
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
                {selectedReq.word_limit && (
                  <p className="text-xs text-slate-500 mt-1">
                    {editedText.split(/\s+/).filter(Boolean).length} /{" "}
                    {selectedReq.word_limit} words
                  </p>
                )}
              </div>

              {/* Save button */}
              {selectedResp && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a requirement to view and edit its response
            </div>
          )}
        </div>
      </div>

      {/* Complete Project Modal */}
      <Modal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Project"
      >
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Mark this project as complete. What was the outcome?
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              className="flex flex-col items-center gap-3 p-6 bg-navy-900 border border-navy-700 rounded-xl hover:border-green-500/50 hover:bg-green-500/5 transition-colors"
              onClick={() => handleComplete("won")}
              disabled={completing}
            >
              <CheckCircle2 size={32} className="text-green-400" />
              <span className="text-white font-medium">Won</span>
              <span className="text-slate-500 text-xs">
                Proposal was accepted
              </span>
            </button>
            <button
              className="flex flex-col items-center gap-3 p-6 bg-navy-900 border border-navy-700 rounded-xl hover:border-red-500/50 hover:bg-red-500/5 transition-colors"
              onClick={() => handleComplete("lost")}
              disabled={completing}
            >
              <Trophy size={32} className="text-red-400" />
              <span className="text-white font-medium">Lost</span>
              <span className="text-slate-500 text-xs">
                Proposal was not selected
              </span>
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCompleteModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
