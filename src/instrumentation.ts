export async function register() {
  // Hanya di server Node.js (bukan edge), jalankan migrasi database sekali saat start
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrate } = await import("./lib/schema");
    try {
      await migrate();
      console.log("[db] skema siap");
    } catch (err) {
      console.error("[db] migrasi gagal. Apakah Postgres sudah berjalan?", err);
    }
  }
}
