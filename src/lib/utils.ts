import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  // Aaron (6/1) — manual time entries displayed one day behind. Root cause:
  // a date-only string like "2026-06-01" passed to `new Date(...)` is parsed
  // as UTC midnight, then toLocaleDateString renders it in the viewer's local
  // zone. For anyone behind UTC (e.g. America/New_York, UTC-4) that's the
  // PREVIOUS evening, so "2026-06-01" shows as "May 31". Parse date-only
  // strings as LOCAL midnight to keep the calendar day intact. Full ISO
  // timestamps (with a time component) are real instants and pass through.
  let d: Date;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, dd] = date.split("-").map(Number);
    d = new Date(y, m - 1, dd);
  } else {
    d = new Date(date);
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Today's date as a YYYY-MM-DD string in the viewer's LOCAL timezone.
 *  Use this for date-input defaults instead of `new Date().toISOString()`,
 *  which returns the UTC date and can roll over to "tomorrow" late in the
 *  evening for anyone behind UTC (same root cause as the formatDate bug). */
export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
