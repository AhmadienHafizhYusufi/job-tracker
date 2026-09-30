import type { Job, Status } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tanggal hari ini (zona waktu lokal) dalam format YYYY-MM-DD */
export function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** "2026-09-30" -> "30 Sep 2026" */
export function fmtDate(d: string | null) {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  return `${+dd} ${MONTHS[+m - 1]} ${y}`;
}

export const statusColor = (s: Status) => `var(--s-${s})`;

export function progress(j: Job) {
  return { done: j.checklist.filter((c) => c.done).length, total: j.checklist.length };
}

export const followDue = (j: Job) =>
  !!j.followUp && j.followUp <= today() && (j.status === "applied" || j.status === "interview");
