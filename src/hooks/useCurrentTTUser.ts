"use client";

import { useEffect, useState } from "react";

/**
 * Client-side hook that fetches the current user's tt_users row once and
 * caches it in module state for the lifetime of the page. Used by Sidebar
 * + page guards to decide what's visible to members vs. admins.
 */

export type TTRole = "admin" | "member";

export interface CurrentTTUser {
  id: string;
  name: string;
  email: string;
  role: TTRole;
  pay_type: string | null;
  status: string;
}

// Simple module-level cache so every consumer on a page doesn't refetch.
let cached: CurrentTTUser | null = null;
let inflight: Promise<CurrentTTUser | null> | null = null;

async function fetchMe(): Promise<CurrentTTUser | null> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/time-tracker/me", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as CurrentTTUser;
      cached = data;
      return data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useCurrentTTUser() {
  const [user, setUser] = useState<CurrentTTUser | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetchMe().then((u) => {
      if (!alive) return;
      setUser(u);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return {
    user,
    loading,
    isAdmin: user?.role === "admin",
    isMember: user?.role === "member",
  };
}
