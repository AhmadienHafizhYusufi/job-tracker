import { NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { createJob, listJobs, sanitize, ValidationError } from "@/lib/jobs";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Silakan login dulu" }, { status: 401 });

// GET /api/jobs — semua lamaran milik user yang login, terbaru dulu
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  try {
    return NextResponse.json(await listJobs(userId));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Tidak bisa terhubung ke database" }, { status: 500 });
  }
}

// POST /api/jobs — buat lamaran baru
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  try {
    const input = sanitize(await req.json());
    return NextResponse.json(await createJob(userId, input), { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof SyntaxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Gagal menyimpan lamaran" }, { status: 500 });
  }
}
