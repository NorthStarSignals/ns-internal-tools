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
  UserX,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface TTUser {
  id: string;
  name: string;
  email: string;
  role: string;
  pay_type: string;
  hourly_rate: number | null;
  retainer_amount: number | null;
  status: string;
  stats?: {
    total_hours_this_month: number;
    total_pay_this_month: number | null;
  };
}

interface TimeEntry {
  id: string;
  user_id: string;
  date: string;
  hours: number;
}

export default function ContractorsPage() {
  const [users, setUsers] = useState<TTUser[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<TTUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPayType, setFormPayType] = useState("hourly");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formRetainerAmount, setFormRetainerAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Deactivate confirmation
  const [deactivateUser, setDeactivateUser] = useState<TTUser | null>(null);
  const [deactivating, setDeactivating] = useState(false);

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
      const [usersRes, entriesRes] = await Promise.all([
        fetch("/api/time-tracker/users"),
        fetch(
          `/api/time-tracker/entries?date_from=${monthStart}&date_to=${monthEnd}`
        ),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (entriesRes.ok) setEntries(await entriesRes.json());
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserMonthHours = (userId: string) =>
    entries
      .filter((e) => e.user_id === userId)
      .reduce((s, e) => s + (e.hours || 0), 0);

  const getUserMonthPay = (user: TTUser) => {
    const hours = getUserMonthHours(user.id);
    if (user.pay_type === "hourly") return hours * (user.hourly_rate || 0);
    if (user.pay_type === "retainer") return user.retainer_amount || 0;
    return 0;
  };

  const openAdd = () => {
    setEditUser(null);
    setFormName("");
    setFormEmail("");
    setFormPayType("hourly");
    setFormHourlyRate("");
    setFormRetainerAmount("");
    setShowModal(true);
  };

  const openEdit = (user: TTUser) => {
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPayType(user.pay_type);
    setFormHourlyRate(user.hourly_rate?.toString() || "");
    setFormRetainerAmount(user.retainer_amount?.toString() || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formEmail) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        email: formEmail,
        pay_type: formPayType,
        hourly_rate: formHourlyRate ? parseFloat(formHourlyRate) : null,
        retainer_amount: formRetainerAmount
          ? parseFloat(formRetainerAmount)
          : null,
      };

      const url = editUser
        ? `/api/time-tracker/users/${editUser.id}`
        : "/api/time-tracker/users";
      const method = editUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editUser ? "Team member updated" : "Team member added");
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save team member");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    setDeactivating(true);
    try {
      const res = await fetch(
        `/api/time-tracker/users/${deactivateUser.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Team member deactivated");
        setDeactivateUser(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to deactivate");
      }
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setDeactivating(false);
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
            <h1 className="text-2xl font-bold text-white">Team</h1>
            <p className="text-slate-400 mt-1">
              Manage team members and pay rates
            </p>
          </div>
        </div>
        <Button
          className="bg-accent-amber hover:bg-accent-amber/80 text-black font-semibold"
          onClick={openAdd}
        >
          <Plus size={16} />
          Add Member
        </Button>
      </div>

      {/* Table */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent-blue" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No team members found
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
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Pay Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Rate
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Hours (Month)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Pay (Month)
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-navy-700/50 hover:bg-navy-700/30"
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 capitalize">
                      {user.pay_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {user.pay_type === "hourly" && user.hourly_rate
                        ? `${formatCurrency(user.hourly_rate)}/hr`
                        : user.pay_type === "retainer" && user.retainer_amount
                          ? `${formatCurrency(user.retainer_amount)}/mo`
                          : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.status === "active" ? "success" : "default"
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                      {getUserMonthHours(user.id).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {user.pay_type === "milestone"
                        ? "Milestone"
                        : formatCurrency(getUserMonthPay(user))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={14} />
                        </Button>
                        {user.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateUser(user)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <UserX size={14} />
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
        title={editUser ? "Edit Team Member" : "Add Team Member"}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Full name"
          />
          <Input
            label="Email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="email@example.com"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Pay Type
            </label>
            <select
              value={formPayType}
              onChange={(e) => setFormPayType(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="hourly">Hourly</option>
              <option value="retainer">Retainer</option>
              <option value="milestone">Milestone</option>
            </select>
          </div>
          {formPayType === "hourly" && (
            <Input
              label="Hourly Rate ($)"
              type="number"
              step="0.01"
              min="0"
              value={formHourlyRate}
              onChange={(e) => setFormHourlyRate(e.target.value)}
              placeholder="0.00"
            />
          )}
          {formPayType === "retainer" && (
            <Input
              label="Retainer Amount ($/month)"
              type="number"
              step="0.01"
              min="0"
              value={formRetainerAmount}
              onChange={(e) => setFormRetainerAmount(e.target.value)}
              placeholder="0.00"
            />
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editUser ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal
        open={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        title="Deactivate Team Member"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to deactivate{" "}
            <span className="text-white font-medium">
              {deactivateUser?.name}
            </span>
            ? They will no longer be able to log time.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setDeactivateUser(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
