import { Pool, types } from "pg";

// Kolom DATE dikembalikan apa adanya ("2026-09-30"), bukan Date JS,
// supaya tidak bergeser karena zona waktu.
types.setTypeParser(1082, (v) => v);

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

// Hindari membuat pool baru setiap hot reload saat development
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;
