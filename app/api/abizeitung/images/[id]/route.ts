import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "abizeitung");

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await getDb()
    .prepare(
      `SELECT image_path, image_mime, image_name
       FROM abizeitung_entries
       WHERE id = ? AND image_path IS NOT NULL AND deleted_at IS NULL`
    )
    .get<{ image_path: string; image_mime: string; image_name: string | null }>(params.id);

  if (!row) return NextResponse.json({ error: "Bild nicht gefunden." }, { status: 404 });

  try {
    const file = await fs.readFile(path.join(UPLOAD_DIR, path.basename(row.image_path)));
    return new NextResponse(file, {
      headers: {
        "content-type": row.image_mime,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bilddatei fehlt." }, { status: 404 });
  }
}
