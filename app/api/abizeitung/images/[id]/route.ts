import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db";
import { readImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Legacy: alte Uploads lagen als Datei auf der Platte. Neue liegen als Blob in der DB.
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "abizeitung");

function serve(data: Buffer, mime: string): NextResponse {
  // Cast, weil der generische Buffer-Typ nicht direkt als BodyInit akzeptiert wird.
  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "content-type": mime,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await getDb()
    .prepare(
      `SELECT image_path, image_mime
       FROM abizeitung_entries
       WHERE id = ? AND image_path IS NOT NULL AND deleted_at IS NULL`
    )
    .get<{ image_path: string; image_mime: string | null }>(params.id);

  if (!row) return NextResponse.json({ error: "Bild nicht gefunden." }, { status: 404 });

  // Neuer Pfad: image_path ist eine Storage-ID.
  const stored = await readImage(row.image_path);
  if (stored) return serve(stored.data, stored.mime);

  // Legacy-Fallback: image_path war ein Dateiname auf der Platte.
  try {
    const file = await fs.readFile(path.join(LEGACY_UPLOAD_DIR, path.basename(row.image_path)));
    return serve(file, row.image_mime || "application/octet-stream");
  } catch {
    return NextResponse.json({ error: "Bilddatei fehlt." }, { status: 404 });
  }
}
