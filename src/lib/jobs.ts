import { pool } from "./db";
import { DEFAULT_CHECKLIST, isStatus, type Job, type JobInput } from "./types";

const SELECT = `
  id, company, role, status, location, salary, source, link, notes, priority,
  applied_date AS "appliedDate",
  follow_up    AS "followUp",
  checklist,
  created_at   AS "createdAt",
  updated_at   AS "updatedAt"`;

/** Field dari client -> nama kolom di database */
const COLUMNS: Record<keyof JobInput, string> = {
  company: "company",
  role: "role",
  status: "status",
  location: "location",
  salary: "salary",
  source: "source",
  link: "link",
  notes: "notes",
  priority: "priority",
  appliedDate: "applied_date",
  followUp: "follow_up",
  checklist: "checklist",
};

const TEXT_FIELDS = ["company", "role", "location", "salary", "source", "link", "notes"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ValidationError extends Error {}

/** Memvalidasi dan merapikan input dari request body. */
export function sanitize(body: unknown): JobInput {
  if (!body || typeof body !== "object") throw new ValidationError("Body harus berupa object JSON");
  const b = body as Record<string, unknown>;
  const out: JobInput = {};

  for (const f of TEXT_FIELDS) {
    if (f in b) {
      if (typeof b[f] !== "string") throw new ValidationError(`${f} harus berupa teks`);
      out[f] = (b[f] as string).slice(0, f === "notes" ? 10000 : 500);
    }
  }
  if ("status" in b) {
    if (!isStatus(b.status)) throw new ValidationError("status tidak valid");
    out.status = b.status;
  }
  if ("priority" in b) {
    if (b.priority !== "normal" && b.priority !== "high") throw new ValidationError("priority tidak valid");
    out.priority = b.priority;
  }
  for (const f of ["appliedDate", "followUp"] as const) {
    if (f in b) {
      const v = b[f];
      if (v === null || v === "") out[f] = null;
      else if (typeof v === "string" && DATE_RE.test(v)) out[f] = v;
      else throw new ValidationError(`${f} harus berformat YYYY-MM-DD`);
    }
  }
  if ("checklist" in b) {
    if (!Array.isArray(b.checklist)) throw new ValidationError("checklist harus berupa array");
    out.checklist = b.checklist.slice(0, 100).map((item) => {
      const i = item as { text?: unknown; done?: unknown };
      if (typeof i?.text !== "string") throw new ValidationError("item checklist tidak valid");
      return { text: i.text.slice(0, 300), done: Boolean(i.done) };
    });
  }
  return out;
}

const toParam = (key: keyof JobInput, value: unknown) =>
  key === "checklist" ? JSON.stringify(value) : value;

export async function listJobs(userId: string): Promise<Job[]> {
  const { rows } = await pool.query<Job>(
    `SELECT ${SELECT} FROM jobs WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

export async function createJob(userId: string, input: JobInput): Promise<Job> {
  const data: JobInput = { checklist: DEFAULT_CHECKLIST, ...input };
  const keys = Object.keys(data) as (keyof JobInput)[];
  const cols = ["user_id", ...keys.map((k) => COLUMNS[k])];
  const params = [userId, ...keys.map((k) => toParam(k, data[k]))];
  const placeholders = params.map((_, i) => `$${i + 1}`);

  const { rows } = await pool.query<Job>(
    `INSERT INTO jobs (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${SELECT}`,
    params,
  );
  return rows[0];
}

/** Hanya mengubah lamaran milik userId. Mengembalikan null jika tidak ada / bukan miliknya. */
export async function updateJob(userId: string, id: string, input: JobInput): Promise<Job | null> {
  const keys = Object.keys(input) as (keyof JobInput)[];
  if (keys.length === 0) {
    const { rows } = await pool.query<Job>(
      `SELECT ${SELECT} FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }
  const sets = keys.map((k, i) => `${COLUMNS[k]} = $${i + 3}`);
  const params = [id, userId, ...keys.map((k) => toParam(k, input[k]))];

  const { rows } = await pool.query<Job>(
    `UPDATE jobs SET ${sets.join(", ")}, updated_at = now()
     WHERE id = $1 AND user_id = $2 RETURNING ${SELECT}`,
    params,
  );
  return rows[0] ?? null;
}

export async function deleteJob(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM jobs WHERE id = $1 AND user_id = $2`, [id, userId]);
  return (rowCount ?? 0) > 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);
