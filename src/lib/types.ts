export const STATUSES = [
  { id: "wishlist", label: "Wishlist" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];
export type Priority = "normal" | "high";

export type ChecklistItem = { text: string; done: boolean };

export type Job = {
  id: string;
  company: string;
  role: string;
  status: Status;
  location: string;
  salary: string;
  source: string;
  link: string;
  notes: string;
  priority: Priority;
  /** Format YYYY-MM-DD, atau null */
  appliedDate: string | null;
  /** Format YYYY-MM-DD, atau null */
  followUp: string | null;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
};

export type JobInput = Partial<Omit<Job, "id" | "createdAt" | "updatedAt">>;

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: "Sesuaikan CV", done: false },
  { text: "Tulis cover letter", done: false },
  { text: "Kirim lamaran", done: false },
  { text: "Follow up setelah 1 minggu", done: false },
];

export const isStatus = (v: unknown): v is Status =>
  typeof v === "string" && STATUSES.some((s) => s.id === v);
