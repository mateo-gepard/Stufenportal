import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db";
import { currentUser, deviceId } from "@/lib/auth";
import { newId, nowIso, trimmed } from "@/lib/util";
import type { AbizeitungEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "abizeitung");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

interface AbizeitungRow {
  id: string;
  device_id: string;
  user_id: string | null;
  author_name: string;
  quote: string | null;
  quoted_name: string | null;
  caption: string | null;
  image_path: string | null;
  image_name: string | null;
  created_at: string;
}

function formText(form: FormData, key: string, max: number): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function mapEntry(row: AbizeitungRow, userId: string | null, device: string | null): AbizeitungEntry {
  return {
    id: row.id,
    author_name: row.author_name,
    quote: row.quote,
    quoted_name: row.quoted_name,
    caption: row.caption,
    image_url: row.image_path ? `/api/abizeitung/images/${row.id}` : null,
    image_name: row.image_name,
    created_at: row.created_at,
    mine: (!!userId && row.user_id === userId) || (!!device && row.device_id === device),
  };
}

export async function GET(req: Request) {
  const currentDevice = deviceId(req);
  const user = await currentUser();
  const rows = await getDb()
    .prepare(
      `SELECT id, device_id, user_id, author_name, quote, quoted_name, caption, image_path, image_name, created_at
       FROM abizeitung_entries
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    )
    .all<AbizeitungRow>();

  return NextResponse.json({ entries: rows.map((row) => mapEntry(row, user?.id ?? null, currentDevice)) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  const form = await req.formData();
  const quote = formText(form, "quote", 600);
  const quotedName = formText(form, "quoted_name", 80);
  const caption = formText(form, "caption", 160);
  const image = form.get("image");

  const hasImage = image instanceof File && image.size > 0;
  if (!quote && !hasImage) {
    return NextResponse.json({ error: "Zitat oder Bild fehlt." }, { status: 400 });
  }

  const id = newId();
  let imagePath: string | null = null;
  let imageMime: string | null = null;
  let imageName: string | null = null;

  if (hasImage) {
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Bild ist zu groß (max. 5 MB)." }, { status: 400 });
    }
    const ext = IMAGE_TYPES[image.type];
    if (!ext) {
      return NextResponse.json({ error: "Bitte ein JPG, PNG, WebP oder GIF hochladen." }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    imagePath = `${id}${ext}`;
    imageMime = image.type;
    imageName = image.name.trim().slice(0, 120) || null;
    await fs.writeFile(path.join(UPLOAD_DIR, imagePath), Buffer.from(await image.arrayBuffer()));
  }

  await getDb()
    .prepare(
      `INSERT INTO abizeitung_entries
       (id, device_id, user_id, author_name, quote, quoted_name, caption, image_path, image_mime, image_name, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      `user:${user.id}`,
      user.id,
      user.display_name,
      quote || null,
      quotedName || null,
      caption || null,
      imagePath,
      imageMime,
      imageName,
      nowIso()
    );

  return NextResponse.json({ id }, { status: 201 });
}
