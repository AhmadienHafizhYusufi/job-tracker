import { pool } from "./db";

type Account = {
  provider: string; // "github" | "google"
  providerId: string; // id akun di provider
  email: string;
  name?: string | null;
  image?: string | null;
};

/** Buat user baru saat login pertama, atau perbarui profilnya. Mengembalikan id user. */
export async function upsertUser(a: Account): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (provider, provider_id, email, name, image)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_id) DO UPDATE
       SET email = EXCLUDED.email, name = EXCLUDED.name, image = EXCLUDED.image, last_login = now()
     RETURNING id`,
    [a.provider, a.providerId, a.email, a.name ?? "", a.image ?? ""],
  );
  return rows[0].id;
}
