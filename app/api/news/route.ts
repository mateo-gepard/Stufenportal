import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isAdmin } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, str, oneOf } from "@/lib/util";
import { broadcast } from "@/lib/push";
import type { NewsItem, Priority, NewsStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITIES = ["normal", "wichtig", "dringend"] as const;
const NEWS_STATUS = ["draft", "published", "hidden", "archived"] as const;

function mapNews(r: any): NewsItem {
  return { ...r, featured: !!r.featured };
}

export async function GET() {
  const db = getDb();
  const admin = await isAdmin();
  const rows = admin
    ? await db.prepare("SELECT * FROM news WHERE deleted_at IS NULL ORDER BY COALESCE(published_at, created_at) DESC").all<any>()
    : await db
        .prepare("SELECT * FROM news WHERE deleted_at IS NULL AND status = 'published' ORDER BY published_at DESC")
        .all<any>();
  return NextResponse.json({ news: rows.map(mapNews) });
}

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const title = trimmed(body.title);
  if (!title) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });

  const db = getDb();
  const id = newId();
  const now = nowIso();
  const status = oneOf<NewsStatus>(body.status, NEWS_STATUS, "published");
  const priority = oneOf<Priority>(body.priority, PRIORITIES, "normal");
  const published_at = status === "published" ? now : null;

  await db
    .prepare(
      `INSERT INTO news (id,title,body,category,priority,status,featured,featured_until,created_at,published_at)
       VALUES (?,?,?,?,?,?,0,NULL,?,?)`
    )
    .run(id, title, str(body.body), trimmed(body.category) || "Allgemein", priority, status, now, published_at);

  // Push bei wichtig/dringend & veröffentlicht.
  if (status === "published" && (priority === "wichtig" || priority === "dringend")) {
    await broadcast({
      title: priority === "dringend" ? "Dringend" : "Wichtig",
      body: title,
      url: "/news",
    });
  }

  return NextResponse.json({ id }, { status: 201 });
}
