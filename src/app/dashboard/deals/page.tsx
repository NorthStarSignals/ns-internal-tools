"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  DollarSign,
  FileText,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import type { Deal } from "@/lib/types";

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

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    deal_name: "",
    business_type: "",
    asking_price: "",
    client_name: "",
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  async function fetchDeals() {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error("Failed to fetch deals");
      const data = await res.json();
      setDeals(data.deals || []);
    } catch {
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.deal_name.trim()) {
      toast.error("Deal name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: form.deal_name,
          business_type: form.business_type || null,
          asking_price: form.asking_price ? Number(form.asking_price) : null,
          client_name: form.client_name || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create deal");
      const data = await res.json();
      setDeals((prev) => [data.deal, ...prev]);
      setShowNewModal(false);
      setForm({ deal_name: "", business_type: "", asking_price: "", client_name: "" });
      toast.success("Deal created");
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setCreating(false);
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
          <h1 className="text-2xl font-bold text-white">Deal Screener</h1>
          <p className="text-slate-400 mt-1">
            Analyze acquisition targets and data rooms
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus size={16} />
          New Deal
        </Button>
      </div>

      {deals.length === 0 ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <FolderOpen className="mx-auto text-slate-500 mb-3" size={40} />
          <p className="text-slate-300 font-medium">No deals yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create your first deal to start screening
          </p>
          <Button className="mt-4" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Deal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal) => (
            <Link
              key={deal.deal_id}
              href={`/dashboard/deals/${deal.deal_id}`}
              className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-navy-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-semibold group-hover:text-accent-blue transition-colors">
                  {deal.deal_name}
                </h3>
                <Badge variant={DEAL_STATUS_VARIANTS[deal.status]}>
                  {DEAL_STATUS_LABELS[deal.status]}
                </Badge>
              </div>

              {deal.business_type && (
                <p className="text-slate-400 text-sm mb-1">{deal.business_type}</p>
              )}
              {deal.client_name && (
                <p className="text-slate-500 text-xs mb-4">{deal.client_name}</p>
              )}

              <div className="space-y-2 text-sm">
                {deal.asking_price != null && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign size={14} />
                    <span>{formatCurrency(deal.asking_price)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <FileText size={14} />
                  <span>{deal.file_count ?? 0} files</span>
                </div>
                {((deal.critical_count ?? 0) > 0 ||
                  (deal.warning_count ?? 0) > 0 ||
                  (deal.note_count ?? 0) > 0) && (
                  <div className="flex items-center gap-3 pt-1">
                    {(deal.critical_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-red-400 text-xs">
                        <AlertCircle size={12} />
                        {deal.critical_count}
                      </span>
                    )}
                    {(deal.warning_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 text-xs">
                        <AlertTriangle size={12} />
                        {deal.warning_count}
                      </span>
                    )}
                    {(deal.note_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-blue-400 text-xs">
                        <Info size={12} />
                        {deal.note_count}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Deal Modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Deal"
      >
        <div className="space-y-4">
          <Input
            label="Deal Name"
            placeholder="e.g., ABC Plumbing Acquisition"
            value={form.deal_name}
            onChange={(e) => setForm({ ...form, deal_name: e.target.value })}
          />
          <Input
            label="Business Type"
            placeholder="e.g., HVAC, Restaurant, Laundromat"
            value={form.business_type}
            onChange={(e) => setForm({ ...form, business_type: e.target.value })}
          />
          <Input
            label="Asking Price"
            type="number"
            placeholder="e.g., 500000"
            value={form.asking_price}
            onChange={(e) => setForm({ ...form, asking_price: e.target.value })}
          />
          <Input
            label="Client Name"
            placeholder="e.g., John Smith"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
