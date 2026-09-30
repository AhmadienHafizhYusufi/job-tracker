# Lamaran Kerja — Job Application Tracker

Board sederhana ala ClickUp untuk melacak lamaran kerja: kolom status (Wishlist → Applied → Interview → Offer → Rejected), checklist per lamaran, tanggal follow up, dan catatan.

Setiap orang login dengan **GitHub** atau **Google** dan hanya melihat lamarannya sendiri.

**Stack**
- **Next.js 16** (App Router, TypeScript) — UI + API routes
- **PostgreSQL 17** di **Docker** — database
- `pg` (node-postgres) — query SQL langsung, tanpa ORM
- **Auth.js v5** (`next-auth`) — login GitHub & Google, sesi JWT

## Struktur

```
job-tracker/
├── docker-compose.yml           # Service `db` (Postgres) dan `app` (Next.js)
├── Dockerfile                   # Image production (output standalone)
└── src/
    ├── auth.ts                  # Konfigurasi Auth.js (GitHub + Google)
    ├── instrumentation.ts       # Menjalankan migrasi database saat server start
    ├── app/
    │   ├── login/page.tsx           # Tombol "Masuk dengan GitHub / Google"
    │   ├── actions.ts               # Server action login / logout
    │   ├── api/auth/[...nextauth]/  # Endpoint Auth.js
    │   ├── api/jobs/route.ts        # GET (list), POST (create)
    │   ├── api/jobs/[id]/route.ts   # PATCH (update), DELETE
    │   ├── layout.tsx
    │   ├── page.tsx                 # Board (wajib login)
    │   └── globals.css
    ├── components/
    │   ├── Board.tsx            # Board + List view, drag & drop, statistik
    │   └── JobDrawer.tsx        # Panel detail lamaran + checklist
    └── lib/
        ├── db.ts                # Connection pool Postgres
        ├── schema.ts            # Skema tabel `users` & `jobs` (idempotent)
        ├── jobs.ts              # Query lamaran (selalu dibatasi per user) + validasi
        ├── users.ts             # Simpan user saat login
        ├── types.ts
        └── ui.ts
```

## 1. Siapkan login (sekali saja)

Tombol login hanya muncul untuk provider yang kredensialnya diisi. Kamu bisa mulai dari GitHub saja.

### a. Buat file `.env` dan `AUTH_SECRET`

```bash
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Tempel hasil perintah kedua ke `AUTH_SECRET=` di `.env`.

### b. GitHub

1. Buka https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Isi:
   - Application name: `Lamaran Kerja (dev)`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. Klik **Register application**, salin **Client ID**, lalu klik **Generate a new client secret** dan salin secret-nya (hanya ditampilkan sekali).
4. Isi di `.env`: `AUTH_GITHUB_ID=...` dan `AUTH_GITHUB_SECRET=...`

### c. Google (gratis, tidak perlu billing)

1. Buka https://console.cloud.google.com dan buat project baru. Abaikan tawaran *Free trial*.
2. **APIs & Services → OAuth consent screen** (di UI baru: **Google Auth Platform**): pilih **External**, isi nama aplikasi dan email.
3. Selama status *Testing*, hanya email di **Test users** yang bisa login. Tambahkan emailmu, atau klik **Publish app** agar semua akun Google bisa login.
4. **Credentials → Create credentials → OAuth client ID** → tipe **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Isi di `.env`: `AUTH_GOOGLE_ID=...` dan `AUTH_GOOGLE_SECRET=...`

> Akun GitHub dan Google dihitung terpisah walaupun emailnya sama. Jangan commit `.env` ke git (sudah ada di `.gitignore`).
> Setiap mengubah `.env`, restart app (`npm run dev` ulang, atau `docker compose up -d` untuk mode Docker).

## 2. Menjalankan

Prasyarat: **Docker Desktop** dan **Node.js 20.9+**.

### Opsi A — Development (Next.js di laptop, Postgres di Docker)

Cocok saat ngoding karena ada hot reload.

```bash
npm install
docker compose up -d db           # jalankan Postgres saja
npm run dev
```

Buka http://localhost:3000

### Opsi B — Semua di Docker

```bash
docker compose up -d --build
```

Buka http://localhost:3000. Hentikan dengan `docker compose down`.

Tabel database dibuat/diperbarui otomatis setiap app start (lihat `src/lib/schema.ts`).

> Data tersimpan di volume Docker `pgdata`, jadi tetap ada walaupun container dimatikan.
> `docker compose down -v` akan **menghapus semua data**.

## API

| Method | Endpoint          | Keterangan                          |
| ------ | ----------------- | ----------------------------------- |
| GET    | `/api/jobs`       | Semua lamaran milikmu, terbaru dulu |
| POST   | `/api/jobs`       | Buat lamaran baru                   |
| PATCH  | `/api/jobs/:id`   | Ubah sebagian field                 |
| DELETE | `/api/jobs/:id`   | Hapus lamaran                       |

Semua endpoint butuh login (tanpa login: `401`). Lamaran milik orang lain dianggap tidak ada (`404`).

Contoh body:

```json
{
  "company": "Tokopedia",
  "role": "Fullstack Developer",
  "status": "applied",
  "appliedDate": "2026-09-30",
  "checklist": [{ "text": "Sesuaikan CV", "done": true }]
}
```

Nilai `status`: `wishlist`, `applied`, `interview`, `offer`, `rejected`.
Tanggal memakai format `YYYY-MM-DD`.

## Data lama sebelum ada login

Lamaran yang dibuat sebelum fitur login tidak punya pemilik, jadi tidak tampil ke siapa pun. Setelah kamu login sekali, klaim data itu ke akunmu (ganti email dan provider sesuai akun yang kamu pakai):

```bash
docker compose exec db psql -U jobtracker -d jobtracker -c "UPDATE jobs SET user_id = (SELECT id FROM users WHERE provider = 'github' AND email = 'emailkamu@gmail.com') WHERE user_id IS NULL;"
```

## Membatasi siapa yang boleh login

Isi `ALLOWED_EMAILS` di `.env` (pisahkan dengan koma). Kosongkan agar semua orang boleh login.

```
ALLOWED_EMAILS=kamu@gmail.com,teman@gmail.com
```

## Agar orang lain bisa mengakses

`localhost` hanya bisa dibuka dari komputermu sendiri. Supaya orang lain bisa memakai web ini, app perlu punya alamat publik, misalnya:

- **Deploy ke VPS** (DigitalOcean, IDCloudHost, dll.): salin proyek, isi `.env`, jalankan `docker compose up -d --build`, lalu pasang domain + HTTPS (mis. lewat Caddy atau Nginx).
- **Coba cepat dari komputer sendiri**: pakai tunnel seperti Cloudflare Tunnel atau ngrok untuk mendapat URL publik sementara.

Setiap kali alamatnya berubah:
1. Ubah `AUTH_URL` di `.env` ke alamat baru, mis. `https://lamaran.domainkamu.com`
2. GitHub: ubah Homepage URL dan callback URL OAuth App ke `https://lamaran.domainkamu.com/api/auth/callback/github` (GitHub hanya menerima satu callback per app, jadi buat OAuth App terpisah untuk lokal dan production)
3. Google: tambahkan origin `https://lamaran.domainkamu.com` dan redirect URI `https://lamaran.domainkamu.com/api/auth/callback/google`

## Mengubah skema database

Tambahkan perintah yang aman dijalankan berulang (mis. `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ...`) ke `src/lib/schema.ts`. Perintah itu akan berjalan otomatis saat app start.
