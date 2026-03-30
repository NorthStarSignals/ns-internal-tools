"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Building2,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type {
  CompanyProfile,
  PastPerformance,
  KeyPerson,
} from "@/lib/types";

const EMPTY_PERFORMANCE: PastPerformance = {
  project_name: "",
  client: "",
  value: "",
  description: "",
};

const EMPTY_PERSON: KeyPerson = { name: "", title: "", bio: "" };

interface ProfileFormState {
  company_name: string;
  industry: string;
  description: string;
  capabilities_input: string;
  certifications_input: string;
  past_performance: PastPerformance[];
  key_personnel: KeyPerson[];
  boilerplate: { key: string; value: string }[];
}

function emptyForm(): ProfileFormState {
  return {
    company_name: "",
    industry: "",
    description: "",
    capabilities_input: "",
    certifications_input: "",
    past_performance: [],
    key_personnel: [],
    boilerplate: [],
  };
}

function profileToForm(p: CompanyProfile): ProfileFormState {
  return {
    company_name: p.company_name,
    industry: p.industry || "",
    description: p.description || "",
    capabilities_input: p.capabilities.join(", "),
    certifications_input: p.certifications.join(", "),
    past_performance: p.past_performance.length
      ? p.past_performance
      : [],
    key_personnel: p.key_personnel.length ? p.key_personnel : [],
    boilerplate: Object.entries(p.boilerplate).map(([key, value]) => ({
      key,
      value,
    })),
  };
}

function formToPayload(form: ProfileFormState) {
  return {
    company_name: form.company_name,
    industry: form.industry || null,
    description: form.description || null,
    capabilities: form.capabilities_input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    certifications: form.certifications_input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    past_performance: form.past_performance.filter(
      (pp) => pp.project_name.trim()
    ),
    key_personnel: form.key_personnel.filter((kp) => kp.name.trim()),
    boilerplate: Object.fromEntries(
      form.boilerplate
        .filter((b) => b.key.trim())
        .map((b) => [b.key, b.value])
    ),
  };
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState<ProfileFormState>(emptyForm());
  const [editForm, setEditForm] = useState<ProfileFormState>(emptyForm());

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const res = await fetch("/api/rfp/profiles");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newForm.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/rfp/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(newForm)),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfiles((prev) => [data.profile, ...prev]);
      setShowNewModal(false);
      setNewForm(emptyForm());
      toast.success("Profile created");
    } catch {
      toast.error("Failed to create profile");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(profileId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/rfp/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(editForm)),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile updated");
      fetchProfiles();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleExpand(profile: CompanyProfile) {
    if (expandedId === profile.profile_id) {
      setExpandedId(null);
    } else {
      setExpandedId(profile.profile_id);
      setEditForm(profileToForm(profile));
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-slate-300">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-white">
              Company Profiles
            </h1>
            <p className="text-slate-400 mt-1">
              Manage company profiles used in RFP responses
            </p>
          </div>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Profile
          </Button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <Building2 className="mx-auto text-slate-500 mb-3" size={40} />
          <p className="text-slate-300 font-medium">No profiles yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create a company profile to use in your RFP responses
          </p>
          <Button className="mt-4" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Profile
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div
              key={profile.profile_id}
              className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden"
            >
              {/* Card header */}
              <button
                className="w-full flex items-center justify-between p-6 text-left hover:bg-navy-700/30 transition-colors"
                onClick={() => handleExpand(profile)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-accent-blue/20 rounded-lg">
                    <Building2 className="text-accent-blue" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {profile.company_name}
                    </h3>
                    {profile.industry && (
                      <p className="text-slate-400 text-sm">
                        {profile.industry}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Award size={14} />
                    <span>{profile.certifications.length} certs</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Zap size={14} />
                    <span>
                      {profile.capabilities.length} capabilities
                    </span>
                  </div>
                  {expandedId === profile.profile_id ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded edit form */}
              {expandedId === profile.profile_id && (
                <div className="border-t border-navy-700 p-6">
                  <ProfileForm
                    form={editForm}
                    setForm={setEditForm}
                    onSave={() => handleSaveEdit(profile.profile_id)}
                    onCancel={() => setExpandedId(null)}
                    saving={saving}
                    submitLabel="Save Changes"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Profile Modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Company Profile"
        className="max-w-2xl"
      >
        <ProfileForm
          form={newForm}
          setForm={setNewForm}
          onSave={handleCreate}
          onCancel={() => setShowNewModal(false)}
          saving={creating}
          submitLabel="Create Profile"
        />
      </Modal>
    </div>
  );
}

// Reusable form component
function ProfileForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  submitLabel,
}: {
  form: ProfileFormState;
  setForm: (f: ProfileFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="space-y-4">
        <Input
          label="Company Name"
          placeholder="e.g., North Star Holdings"
          value={form.company_name}
          onChange={(e) =>
            setForm({ ...form, company_name: e.target.value })
          }
        />
        <Input
          label="Industry"
          placeholder="e.g., Government IT Services"
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue min-h-[80px] resize-y"
            placeholder="Brief company description..."
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>
      </div>

      {/* Tag inputs */}
      <div className="space-y-4">
        <Input
          label="Capabilities (comma-separated)"
          placeholder="e.g., Cloud Migration, Cybersecurity, Data Analytics"
          value={form.capabilities_input}
          onChange={(e) =>
            setForm({ ...form, capabilities_input: e.target.value })
          }
        />
        <Input
          label="Certifications (comma-separated)"
          placeholder="e.g., ISO 27001, FedRAMP, SOC 2 Type II"
          value={form.certifications_input}
          onChange={(e) =>
            setForm({ ...form, certifications_input: e.target.value })
          }
        />
      </div>

      {/* Past Performance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-300">
            Past Performance
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setForm({
                ...form,
                past_performance: [
                  ...form.past_performance,
                  { ...EMPTY_PERFORMANCE },
                ],
              })
            }
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
        {form.past_performance.map((pp, i) => (
          <div
            key={i}
            className="bg-navy-900 rounded-lg p-4 mb-3 space-y-3 relative"
          >
            <button
              className="absolute top-2 right-2 p-1 rounded hover:bg-navy-700 text-slate-500 hover:text-red-400"
              onClick={() =>
                setForm({
                  ...form,
                  past_performance: form.past_performance.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            >
              <X size={14} />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Project Name"
                value={pp.project_name}
                onChange={(e) => {
                  const updated = [...form.past_performance];
                  updated[i] = { ...updated[i], project_name: e.target.value };
                  setForm({ ...form, past_performance: updated });
                }}
              />
              <Input
                placeholder="Client"
                value={pp.client}
                onChange={(e) => {
                  const updated = [...form.past_performance];
                  updated[i] = { ...updated[i], client: e.target.value };
                  setForm({ ...form, past_performance: updated });
                }}
              />
            </div>
            <Input
              placeholder="Contract Value (e.g., $1.2M)"
              value={pp.value}
              onChange={(e) => {
                const updated = [...form.past_performance];
                updated[i] = { ...updated[i], value: e.target.value };
                setForm({ ...form, past_performance: updated });
              }}
            />
            <textarea
              className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 min-h-[60px] resize-y"
              placeholder="Description of work performed..."
              value={pp.description}
              onChange={(e) => {
                const updated = [...form.past_performance];
                updated[i] = { ...updated[i], description: e.target.value };
                setForm({ ...form, past_performance: updated });
              }}
            />
          </div>
        ))}
      </div>

      {/* Key Personnel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-300">
            Key Personnel
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setForm({
                ...form,
                key_personnel: [
                  ...form.key_personnel,
                  { ...EMPTY_PERSON },
                ],
              })
            }
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
        {form.key_personnel.map((kp, i) => (
          <div
            key={i}
            className="bg-navy-900 rounded-lg p-4 mb-3 space-y-3 relative"
          >
            <button
              className="absolute top-2 right-2 p-1 rounded hover:bg-navy-700 text-slate-500 hover:text-red-400"
              onClick={() =>
                setForm({
                  ...form,
                  key_personnel: form.key_personnel.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            >
              <X size={14} />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Name"
                value={kp.name}
                onChange={(e) => {
                  const updated = [...form.key_personnel];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setForm({ ...form, key_personnel: updated });
                }}
              />
              <Input
                placeholder="Title"
                value={kp.title}
                onChange={(e) => {
                  const updated = [...form.key_personnel];
                  updated[i] = { ...updated[i], title: e.target.value };
                  setForm({ ...form, key_personnel: updated });
                }}
              />
            </div>
            <textarea
              className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 min-h-[60px] resize-y"
              placeholder="Bio / qualifications..."
              value={kp.bio}
              onChange={(e) => {
                const updated = [...form.key_personnel];
                updated[i] = { ...updated[i], bio: e.target.value };
                setForm({ ...form, key_personnel: updated });
              }}
            />
          </div>
        ))}
      </div>

      {/* Boilerplate */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-300">
            Boilerplate (Key-Value Pairs)
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setForm({
                ...form,
                boilerplate: [...form.boilerplate, { key: "", value: "" }],
              })
            }
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
        {form.boilerplate.map((bp, i) => (
          <div key={i} className="flex items-start gap-3 mb-3">
            <Input
              placeholder="Key (e.g., company_overview)"
              value={bp.key}
              onChange={(e) => {
                const updated = [...form.boilerplate];
                updated[i] = { ...updated[i], key: e.target.value };
                setForm({ ...form, boilerplate: updated });
              }}
              className="flex-shrink-0 w-48"
            />
            <textarea
              className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 min-h-[38px] resize-y"
              placeholder="Value text..."
              value={bp.value}
              onChange={(e) => {
                const updated = [...form.boilerplate];
                updated[i] = { ...updated[i], value: e.target.value };
                setForm({ ...form, boilerplate: updated });
              }}
            />
            <button
              className="p-2 rounded hover:bg-navy-700 text-slate-500 hover:text-red-400 mt-0.5"
              onClick={() =>
                setForm({
                  ...form,
                  boilerplate: form.boilerplate.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
