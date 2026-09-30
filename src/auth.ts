import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { upsertUser } from "@/lib/users";

/**
 * Provider hanya diaktifkan kalau kredensialnya diisi di .env,
 * jadi kamu bisa mulai dari GitHub saja lalu menambah Google belakangan.
 */
const providers: Provider[] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

/** Dipakai halaman login untuk menampilkan tombol yang aktif saja */
export const enabledProviders = {
  github: providers.includes(GitHub),
  google: providers.includes(Google),
};

/**
 * Daftar email yang boleh login, dipisah koma. Kosong = semua orang boleh.
 * Contoh: ALLOWED_EMAILS=kamu@gmail.com,teman@gmail.com
 */
const allowed = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    signIn({ user, account, profile }) {
      // Tolak akun tanpa email, atau email Google yang belum terverifikasi
      if (!user.email) return false;
      if (account?.provider === "google" && profile?.email_verified === false) return false;
      return allowed.length === 0 || allowed.includes(user.email.toLowerCase());
    },
    async jwt({ token, user, account }) {
      // Hanya berjalan saat login: simpan/ambil user di database, taruh id-nya di token
      if (account && user?.email) {
        token.uid = await upsertUser({
          provider: account.provider,
          providerId: account.providerAccountId,
          email: user.email,
          name: user.name,
          image: user.image,
        });
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});

/** Id user yang sedang login, atau null. Dipakai di API routes. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
