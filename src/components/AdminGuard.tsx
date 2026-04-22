"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentTTUser } from "@/hooks/useCurrentTTUser";

/**
 * Wrap an admin-only page's content in <AdminGuard>…</AdminGuard>.
 * While the user record is loading, render nothing (avoids a flash of
 * admin UI for members). If the resolved user isn't an admin, bounce
 * them to the Timer view.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useCurrentTTUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && !isAdmin) {
      router.replace("/dashboard/time-tracker");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user) return null;
  if (!isAdmin) return null;
  return <>{children}</>;
}
