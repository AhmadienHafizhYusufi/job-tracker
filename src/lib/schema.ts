import { pool } from "./db";

/**
 * Skema database. Semua perintah aman dijalankan berulang (idempotent),
 * jadi dijalankan setiap kali server start lewat src/instrumentation.ts.
 * Database versi lama otomatis diperbarui (tabel `users`, kolom `jobs.user_id`, kolom provider).
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     text NOT NULL,              -- 'github' | 'google'
  provider_id  text NOT NULL,              -- id akun di provider tersebut
  email        text NOT NULL,
  name         text NOT NULL DEFAULT '',
  image        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_login   timestamptz NOT NULL DEFAULT now()
);

-- Versi sebelumnya hanya punya kolom google_id: pindahkan ke provider/provider_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id text;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'google_id') THEN
    UPDATE users SET provider = 'google', provider_id = google_id WHERE provider IS NULL;
    ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_account_idx ON users (provider, provider_id);

CREATE TABLE IF NOT EXISTS jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company       text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'wishlist'
                CHECK (status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  location      text NOT NULL DEFAULT '',
  salary        text NOT NULL DEFAULT '',
  source        text NOT NULL DEFAULT '',
  link          text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  priority      text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  applied_date  date,
  follow_up     date,
  checklist     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS jobs_user_created_idx ON jobs (user_id, created_at DESC);
`;

export async function migrate() {
  const client = await pool.connect();
  try {
    // Kunci agar dua instance app tidak migrasi bersamaan
    await client.query("SELECT pg_advisory_lock(424242)");
    await client.query(SCHEMA);
  } finally {
    await client.query("SELECT pg_advisory_unlock(424242)").catch(() => {});
    client.release();
  }
}
