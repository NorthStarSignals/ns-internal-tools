"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Bot,
  Snowflake,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface ConnectionStatus {
  name: string;
  description: string;
  icon: React.ElementType;
  status: "connected" | "disconnected" | "checking";
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([
    {
      name: "Supabase",
      description: "Database and file storage",
      icon: Database,
      status: "checking",
    },
    {
      name: "Claude API",
      description: "AI-powered document analysis",
      icon: Bot,
      status: "checking",
    },
    {
      name: "Snowflake",
      description: "Data warehouse analytics",
      icon: Snowflake,
      status: "checking",
    },
  ]);

  useEffect(() => {
    checkConnections();
  }, []);

  async function checkConnections() {
    // Check Supabase
    try {
      const res = await fetch("/api/health/supabase");
      setConnections((prev) =>
        prev.map((c) =>
          c.name === "Supabase"
            ? { ...c, status: res.ok ? "connected" : "disconnected" }
            : c
        )
      );
    } catch {
      setConnections((prev) =>
        prev.map((c) =>
          c.name === "Supabase" ? { ...c, status: "disconnected" } : c
        )
      );
    }

    // Check Claude API key
    try {
      const res = await fetch("/api/health/claude");
      setConnections((prev) =>
        prev.map((c) =>
          c.name === "Claude API"
            ? { ...c, status: res.ok ? "connected" : "disconnected" }
            : c
        )
      );
    } catch {
      setConnections((prev) =>
        prev.map((c) =>
          c.name === "Claude API" ? { ...c, status: "disconnected" } : c
        )
      );
    }

    // Check Snowflake credentials
    try {
      const res = await fetch("/api/health/snowflake");
      setConnections((prev) =>
        prev.map((c) =>
          c.name === "Snowflake"
            ? { ...c, status: res.ok ? "connected" : "disconnected" }
            : c
        )
      );
    } catch {
      setConnections((prev) =>
        prev.map((c) =>
          c.name === "Snowflake" ? { ...c, status: "disconnected" } : c
        )
      );
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          API connections and service status
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">API Connections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connections.map((conn) => {
            const Icon = conn.icon;
            return (
              <div
                key={conn.name}
                className="bg-navy-800 border border-navy-700 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-navy-900 rounded-lg">
                    <Icon size={24} className="text-slate-300" />
                  </div>
                  {conn.status === "checking" ? (
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  ) : conn.status === "connected" ? (
                    <CheckCircle2 size={20} className="text-green-400" />
                  ) : (
                    <XCircle size={20} className="text-red-400" />
                  )}
                </div>
                <h3 className="text-white font-semibold">{conn.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{conn.description}</p>
                <p
                  className={`text-xs font-medium mt-3 ${
                    conn.status === "connected"
                      ? "text-green-400"
                      : conn.status === "disconnected"
                      ? "text-red-400"
                      : "text-slate-500"
                  }`}
                >
                  {conn.status === "checking"
                    ? "Checking..."
                    : conn.status === "connected"
                    ? "Connected"
                    : "Not configured"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
