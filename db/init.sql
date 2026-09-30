-- Dijalankan otomatis oleh container Postgres saat volume database masih kosong.

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

CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs (created_at DESC);
