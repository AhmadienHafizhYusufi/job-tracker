import { NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { deleteJob, isUuid, sanitize, updateJob, ValidationError } from "@/lib/jobs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Lamaran tidak ditemukan" }, { status: 404 });
const unauthorized = () => NextResponse.json({ error: "Silakan login dulu" }, { status: 401 });

// PATCH /api/jobs/:id — ubah sebagian field (hanya milik sendiri)
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const job = await updateJob(userId, id, sanitize(await req.json()));
    return job ? NextResponse.json(job) : notFound();
  } catch (err) {
    if (err instanceof ValidationError || err instanceof SyntaxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}

// DELETE /api/jobs/:id (hanya milik sendiri)
export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    return (await deleteJob(userId, id)) ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menghapus lamaran" }, { status: 500 });
  }
}
