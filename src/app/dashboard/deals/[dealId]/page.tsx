"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  FileText,
  FileSpreadsheet,
  File,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  X,
  MessageSquare,
  TrendingUp,
  DollarSign,
  BarChart3,
  Scale,
  Loader2,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { DOCUMENT_CATEGORIES, RED_FLAG_SEVERITY } from "@/lib/constants";
import type {
  Deal,
  DataRoomFile,
  FinancialExtract,
  LegalExtract,
  RedFlag,
  DocumentCategory,
} from "@/lib/types";

type TabKey = "dataroom" | "financials" | "legal" | "redflags";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dataroom", label: "Data Room" },
  { key: "financials", label: "Financials" },
  { key: "legal", label: "Legal" },
  { key: "redflags", label: "Red Flags" },
];

const DEAL_STATUS_VARIANTS: Record<Deal["status"], "default" | "note" | "warning" | "success"> = {
  uploading: "default",
  processing: "note",
  review: "warning",
  completed: "success",
};

const DEAL_STATUS_LABELS: Record<Deal["status"], string> = {
  uploading: "Uploading",
  processing: "Processing",
  review: "In Review",
  completed: "Completed",
};

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("sheet") || fileType.includes("csv") || fileType.includes("xlsx"))
    return FileSpreadsheet;
  return File;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("dataroom");

  // Data Room state
  const [files, setFiles] = useState<DataRoomFile[]>([]);
  const [classifying, setClassifying] = useState(false);

  // Financials state
  const [financials, setFinancials] = useState<FinancialExtract[]>([]);
  const [extractingFinancials, setExtractingFinancials] = useState(false);

  // Legal state
  const [legalExtracts, setLegalExtracts] = useState<LegalExtract[]>([]);
  const [extractingLegal, setExtractingLegal] = useState(false);

  // Red Flags state
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals?deal_id=${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch deal");
      const data = await res.json();
      setDeal(data.deal || null);
      setFiles(data.files || []);
    } catch {
      toast.error("Failed to load deal");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (!dealId) return;
    if (activeTab === "financials") fetchFinancials();
    if (activeTab === "legal") fetchLegal();
    if (activeTab === "redflags") fetchRedFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dealId]);

  async function fetchFinancials() {
    try {
      const res = await fetch(`/api/deals/financials?deal_id=${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch financials");
      const data = await res.json();
      setFinancials(data.extracts || []);
    } catch {
      toast.error("Failed to load financials");
    }
  }

  async function fetchLegal() {
    try {
      const res = await fetch(`/api/deals/legal?deal_id=${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch legal extracts");
      const data = await res.json();
      setLegalExtracts(data.extracts || []);
    } catch {
      toast.error("Failed to load legal extracts");
    }
  }

  async function fetchRedFlags() {
    try {
      const res = await fetch(`/api/deals/red-flags?deal_id=${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch red flags");
      const data = await res.json();
      setRedFlags(data.flags || []);
    } catch {
      toast.error("Failed to load red flags");
    }
  }

  // --- Data Room handlers ---
  async function handleFileUpload(uploadedFiles: globalThis.File[]) {
    const formData = new FormData();
    formData.append("deal_id", dealId);
    uploadedFiles.forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("/api/deals/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFiles((prev) => [...prev, ...(data.files || [])]);
      toast.success(`${uploadedFiles.length} file(s) uploaded`);
    } catch {
      toast.error("File upload failed");
    }
  }

  async function handleClassify() {
    setClassifying(true);
    try {
      const res = await fetch("/api/deals/files/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (!res.ok) throw new Error("Classification failed");
      const data = await res.json();
      setFiles(data.files || files);
      toast.success("Documents classified");
    } catch {
      toast.error("Classification failed");
    } finally {
      setClassifying(false);
    }
  }

  async function handleReclassify(fileId: string, category: DocumentCategory) {
    try {
      const res = await fetch(`/api/deals/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_category: category }),
      });
      if (!res.ok) throw new Error("Reclassify failed");
      setFiles((prev) =>
        prev.map((f) =>
          f.file_id === fileId ? { ...f, document_category: category } : f
        )
      );
      toast.success("Category updated");
    } catch {
      toast.error("Failed to update category");
    }
  }

  // --- Financials handlers ---
  async function handleExtractFinancials() {
    setExtractingFinancials(true);
    try {
      const res = await fetch("/api/deals/extract/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      setFinancials(data.extracts || []);
      toast.success("Financial data extracted");
    } catch {
      toast.error("Financial extraction failed");
    } finally {
      setExtractingFinancials(false);
    }
  }

  // --- Legal handlers ---
  async function handleExtractLegal() {
    setExtractingLegal(true);
    try {
      const res = await fetch("/api/deals/extract/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      setLegalExtracts(data.extracts || []);
      toast.success("Legal terms extracted");
    } catch {
      toast.error("Legal extraction failed");
    } finally {
      setExtractingLegal(false);
    }
  }

  // --- Red Flags handlers ---
  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/deals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setRedFlags(data.flags || []);
      toast.success("Analysis complete");
    } catch {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDismissFlag(flagId: string) {
    try {
      const res = await fetch(`/api/deals/red-flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_dismissed: true }),
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      setRedFlags((prev) =>
        prev.map((f) => (f.flag_id === flagId ? { ...f, is_dismissed: true } : f))
      );
      toast.success("Flag dismissed");
    } catch {
      toast.error("Failed to dismiss flag");
    }
  }

  async function handleAddNote(flagId: string) {
    const note = noteInputs[flagId]?.trim();
    if (!note) return;
    try {
      const res = await fetch(`/api/deals/red-flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyst_notes: note }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setRedFlags((prev) =>
        prev.map((f) => (f.flag_id === flagId ? { ...f, analyst_notes: note } : f))
      );
      setNoteInputs((prev) => ({ ...prev, [flagId]: "" }));
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      const res = await fetch("/api/deals/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deal?.deal_name || "deal"}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function toggleFlag(flagId: string) {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  }

  // --- Computed values ---
  const missingDocs: string[] = [];
  const categories = files.map((f) => f.document_category);
  if (!categories.includes("tax_return")) missingDocs.push("Tax Return");
  if (!categories.includes("pnl")) missingDocs.push("P&L Statement");
  if (!categories.includes("lease")) missingDocs.push("Lease Agreement");

  const latestFinancial = financials.length > 0 ? financials[financials.length - 1] : null;
  const grossMarginPct =
    latestFinancial?.revenue && latestFinancial.gross_margin
      ? ((latestFinancial.gross_margin / latestFinancial.revenue) * 100).toFixed(1)
      : null;

  const revenueChartData = financials.map((f) => ({
    period: f.period,
    revenue: f.revenue ?? 0,
  }));

  const criticalCount = redFlags.filter((f) => f.severity === "critical" && !f.is_dismissed).length;
  const warningCount = redFlags.filter((f) => f.severity === "warning" && !f.is_dismissed).length;
  const noteCount = redFlags.filter((f) => f.severity === "note" && !f.is_dismissed).length;
  const activeFlags = redFlags.filter((f) => !f.is_dismissed);
  const sortedFlags = [
    ...activeFlags.filter((f) => f.severity === "critical"),
    ...activeFlags.filter((f) => f.severity === "warning"),
    ...activeFlags.filter((f) => f.severity === "note"),
  ];

  const legalGrouped = legalExtracts.reduce<Record<string, LegalExtract[]>>((acc, ext) => {
    const key = ext.document_type || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ext);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-slate-300">
          Loading...
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <p className="text-slate-300">Deal not found</p>
          <Button className="mt-4" variant="secondary" onClick={() => router.push("/dashboard/deals")}>
            Back to Deals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/deals")}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Deals
        </button>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">{deal.deal_name}</h1>
                <Badge variant={DEAL_STATUS_VARIANTS[deal.status]}>
                  {DEAL_STATUS_LABELS[deal.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                {deal.business_type && <span>{deal.business_type}</span>}
                {deal.asking_price != null && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} />
                    {formatCurrency(deal.asking_price)}
                  </span>
                )}
                {deal.client_name && <span>Client: {deal.client_name}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-700">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === tab.key
                  ? "bg-navy-800 text-accent-amber border-b-2 border-accent-amber"
                  : "text-slate-400 hover:text-white hover:bg-navy-800/50"
              )}
            >
              {tab.label}
              {tab.key === "redflags" && criticalCount > 0 && (
                <span className="ml-2 bg-red-500/20 text-red-300 text-xs px-1.5 py-0.5 rounded">
                  {criticalCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "dataroom" && (
        <DataRoomTab
          files={files}
          missingDocs={missingDocs}
          classifying={classifying}
          onUpload={handleFileUpload}
          onClassify={handleClassify}
          onReclassify={handleReclassify}
        />
      )}

      {activeTab === "financials" && (
        <FinancialsTab
          financials={financials}
          latestFinancial={latestFinancial}
          grossMarginPct={grossMarginPct}
          chartData={revenueChartData}
          extracting={extractingFinancials}
          onExtract={handleExtractFinancials}
        />
      )}

      {activeTab === "legal" && (
        <LegalTab
          grouped={legalGrouped}
          extracting={extractingLegal}
          onExtract={handleExtractLegal}
        />
      )}

      {activeTab === "redflags" && (
        <RedFlagsTab
          flags={sortedFlags}
          criticalCount={criticalCount}
          warningCount={warningCount}
          noteCount={noteCount}
          analyzing={analyzing}
          exporting={exporting}
          expandedFlags={expandedFlags}
          noteInputs={noteInputs}
          onAnalyze={handleAnalyze}
          onExport={handleExportPdf}
          onToggle={toggleFlag}
          onDismiss={handleDismissFlag}
          onNoteChange={(flagId, val) => setNoteInputs((p) => ({ ...p, [flagId]: val }))}
          onAddNote={handleAddNote}
        />
      )}
    </div>
  );
}

// ==================== DATA ROOM TAB ====================
function DataRoomTab({
  files,
  missingDocs,
  classifying,
  onUpload,
  onClassify,
  onReclassify,
}: {
  files: DataRoomFile[];
  missingDocs: string[];
  classifying: boolean;
  onUpload: (files: globalThis.File[]) => Promise<void>;
  onClassify: () => void;
  onReclassify: (fileId: string, category: DocumentCategory) => void;
}) {
  return (
    <div className="space-y-6">
      <FileUpload
        onUpload={onUpload}
        multiple={true}
        accept=".pdf,.docx,.xlsx,.csv"
        label="Upload data room documents"
      />

      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={onClassify}
            disabled={classifying}
            variant="secondary"
          >
            {classifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Classifying...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Classify Documents
              </>
            )}
          </Button>
          <span className="text-sm text-slate-400">{files.length} file(s) uploaded</span>
        </div>
      )}

      {/* Missing document warning */}
      {files.length > 0 && missingDocs.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">Missing key documents</p>
            <p className="text-amber-300/70 text-sm mt-1">
              No files classified as: {missingDocs.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-navy-700 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">File</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2">Confidence</div>
            <div className="col-span-3">Status</div>
          </div>
          {files.map((file) => {
            const Icon = getFileIcon(file.file_type);
            const catInfo = file.document_category
              ? DOCUMENT_CATEGORIES[file.document_category]
              : null;
            return (
              <div
                key={file.file_id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-navy-700/50 items-center hover:bg-navy-700/30"
              >
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <Icon size={16} className="text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{file.file_name}</span>
                </div>
                <div className="col-span-3">
                  <select
                    value={file.document_category || ""}
                    onChange={(e) =>
                      onReclassify(file.file_id, e.target.value as DocumentCategory)
                    }
                    className="w-full px-2 py-1 bg-navy-900 border border-navy-700 rounded text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                  >
                    <option value="">Unclassified</option>
                    {Object.entries(DOCUMENT_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  {file.classification_confidence != null ? (
                    <span className="text-sm text-slate-300">
                      {(file.classification_confidence * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">--</span>
                  )}
                </div>
                <div className="col-span-3">
                  <Badge
                    variant={
                      file.processing_status === "completed"
                        ? "success"
                        : file.processing_status === "failed"
                        ? "critical"
                        : file.processing_status === "pending"
                        ? "default"
                        : "note"
                    }
                  >
                    {file.processing_status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== FINANCIALS TAB ====================
function FinancialsTab({
  financials,
  latestFinancial,
  grossMarginPct,
  chartData,
  extracting,
  onExtract,
}: {
  financials: FinancialExtract[];
  latestFinancial: FinancialExtract | null;
  grossMarginPct: string | null;
  chartData: { period: string; revenue: number }[];
  extracting: boolean;
  onExtract: () => void;
}) {
  return (
    <div className="space-y-6">
      <Button onClick={onExtract} disabled={extracting} variant="secondary">
        {extracting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Extracting...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Extract Financials
          </>
        )}
      </Button>

      {/* Summary cards */}
      {latestFinancial && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={DollarSign}
            label="Revenue"
            value={latestFinancial.revenue != null ? formatCurrency(latestFinancial.revenue) : "--"}
          />
          <SummaryCard
            icon={TrendingUp}
            label="Gross Margin"
            value={grossMarginPct ? `${grossMarginPct}%` : "--"}
          />
          <SummaryCard
            icon={Scale}
            label="Net Income"
            value={latestFinancial.net_income != null ? formatCurrency(latestFinancial.net_income) : "--"}
          />
          <SummaryCard
            icon={BarChart3}
            label="EBITDA"
            value={latestFinancial.ebitda != null ? formatCurrency(latestFinancial.ebitda) : "--"}
          />
        </div>
      )}

      {/* Revenue chart */}
      {chartData.length > 1 && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243056" />
                <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 12 }} />
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
                  formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#d4a843" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Financial table */}
      {financials.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">COGS</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Gross Margin</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Net Income</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {financials.map((f) => (
                  <tr key={f.extract_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                    <td className="px-4 py-3 text-slate-200">{f.period}</td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {f.revenue != null ? formatCurrency(f.revenue) : "--"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {f.cogs != null ? formatCurrency(f.cogs) : "--"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {f.gross_margin != null ? formatCurrency(f.gross_margin) : "--"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {f.net_income != null ? formatCurrency(f.net_income) : "--"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {f.ebitda != null ? formatCurrency(f.ebitda) : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {financials.length === 0 && !extracting && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <BarChart3 className="mx-auto text-slate-500 mb-3" size={40} />
          <p className="text-slate-300 font-medium">No financial data yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Upload financial documents and click Extract Financials
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

// ==================== LEGAL TAB ====================
function LegalTab({
  grouped,
  extracting,
  onExtract,
}: {
  grouped: Record<string, LegalExtract[]>;
  extracting: boolean;
  onExtract: () => void;
}) {
  const riskVariant = (level: string) => {
    if (level === "critical") return "critical";
    if (level === "warning") return "warning";
    return "note";
  };

  return (
    <div className="space-y-6">
      <Button onClick={onExtract} disabled={extracting} variant="secondary">
        {extracting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Extracting...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Extract Legal Terms
          </>
        )}
      </Button>

      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([docType, extracts]) => (
          <div key={docType} className="space-y-3">
            <h3 className="text-white font-semibold text-lg">{docType}</h3>
            {extracts.map((ext) => (
              <div
                key={ext.extract_id}
                className="bg-navy-800 border border-navy-700 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    {ext.counterparty && (
                      <p className="text-white font-medium">{ext.counterparty}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      {ext.effective_date && <span>Effective: {formatDate(ext.effective_date)}</span>}
                      {ext.expiration_date && <span>Expires: {formatDate(ext.expiration_date)}</span>}
                    </div>
                  </div>
                  <Badge variant={riskVariant(ext.risk_level)}>
                    {ext.risk_level}
                  </Badge>
                </div>

                {ext.key_terms && Object.keys(ext.key_terms).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                      Key Terms
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(ext.key_terms).map(([key, val]) => (
                        <div key={key} className="bg-navy-900 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-500">{key}</span>
                          <p className="text-sm text-slate-200">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ext.change_of_control_clause && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-amber-300 mb-1">Change of Control</p>
                    <p className="text-sm text-amber-200/80">{ext.change_of_control_clause}</p>
                  </div>
                )}

                {ext.termination_provisions && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Termination Provisions
                    </p>
                    <p className="text-sm text-slate-300">{ext.termination_provisions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      ) : (
        !extracting && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
            <Scale className="mx-auto text-slate-500 mb-3" size={40} />
            <p className="text-slate-300 font-medium">No legal extracts yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Upload contracts and click Extract Legal Terms
            </p>
          </div>
        )
      )}
    </div>
  );
}

// ==================== RED FLAGS TAB ====================
function RedFlagsTab({
  flags,
  criticalCount,
  warningCount,
  noteCount,
  analyzing,
  exporting,
  expandedFlags,
  noteInputs,
  onAnalyze,
  onExport,
  onToggle,
  onDismiss,
  onNoteChange,
  onAddNote,
}: {
  flags: RedFlag[];
  criticalCount: number;
  warningCount: number;
  noteCount: number;
  analyzing: boolean;
  exporting: boolean;
  expandedFlags: Set<string>;
  noteInputs: Record<string, string>;
  onAnalyze: () => void;
  onExport: () => void;
  onToggle: (id: string) => void;
  onDismiss: (id: string) => void;
  onNoteChange: (id: string, val: string) => void;
  onAddNote: (id: string) => void;
}) {
  const severityIcon = (severity: string) => {
    if (severity === "critical") return <AlertCircle size={16} className="text-red-400" />;
    if (severity === "warning") return <AlertTriangle size={16} className="text-amber-400" />;
    return <Info size={16} className="text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={onAnalyze} disabled={analyzing} variant="secondary">
          {analyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Run Analysis
            </>
          )}
        </Button>
        <Button onClick={onExport} disabled={exporting} variant="secondary">
          {exporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={16} />
              Export Report
            </>
          )}
        </Button>
      </div>

      {/* Summary counts */}
      {(criticalCount > 0 || warningCount > 0 || noteCount > 0) && (
        <div className="flex items-center gap-4">
          {criticalCount > 0 && (
            <Badge variant="critical">{criticalCount} Critical</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="warning">{warningCount} Warnings</Badge>
          )}
          {noteCount > 0 && (
            <Badge variant="note">{noteCount} Notes</Badge>
          )}
        </div>
      )}

      {/* Flag cards */}
      {flags.length > 0 ? (
        <div className="space-y-3">
          {flags.map((flag) => {
            const expanded = expandedFlags.has(flag.flag_id);
            const sevInfo = RED_FLAG_SEVERITY[flag.severity];
            return (
              <div
                key={flag.flag_id}
                className={cn(
                  "bg-navy-800 border rounded-xl overflow-hidden",
                  sevInfo.color.includes("red")
                    ? "border-red-500/30"
                    : sevInfo.color.includes("amber")
                    ? "border-amber-500/30"
                    : "border-blue-500/30"
                )}
              >
                <button
                  onClick={() => onToggle(flag.flag_id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-navy-700/30 transition-colors"
                >
                  {severityIcon(flag.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{flag.title}</span>
                      <Badge variant={flag.severity === "critical" ? "critical" : flag.severity === "warning" ? "warning" : "note"}>
                        {sevInfo.label}
                      </Badge>
                      <Badge>{flag.category}</Badge>
                    </div>
                    {!expanded && (
                      <p className="text-sm text-slate-400 mt-1 truncate">
                        {flag.description}
                      </p>
                    )}
                  </div>
                  {expanded ? (
                    <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-navy-700">
                    <div className="pt-4">
                      <p className="text-sm text-slate-300">{flag.description}</p>
                    </div>

                    {flag.source_reference && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Source
                        </p>
                        <p className="text-sm text-slate-400">{flag.source_reference}</p>
                      </div>
                    )}

                    {flag.recommendation && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Recommendation
                        </p>
                        <p className="text-sm text-slate-300">{flag.recommendation}</p>
                      </div>
                    )}

                    {flag.analyst_notes && (
                      <div className="bg-navy-900 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-slate-500 mb-1">Analyst Note</p>
                        <p className="text-sm text-slate-300">{flag.analyst_notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <Button size="sm" variant="danger" onClick={() => onDismiss(flag.flag_id)}>
                        <X size={14} />
                        Dismiss
                      </Button>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Add analyst note..."
                          value={noteInputs[flag.flag_id] || ""}
                          onChange={(e) => onNoteChange(flag.flag_id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onAddNote(flag.flag_id);
                          }}
                          className="flex-1 px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAddNote(flag.flag_id)}
                        >
                          <MessageSquare size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !analyzing && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
            <AlertCircle className="mx-auto text-slate-500 mb-3" size={40} />
            <p className="text-slate-300 font-medium">No red flags yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Click Run Analysis to scan for potential issues
            </p>
          </div>
        )
      )}
    </div>
  );
}
