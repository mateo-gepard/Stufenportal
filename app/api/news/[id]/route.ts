import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nowIso, readJson, trimmed, str, oneOf } from "@/lib/util";
import type { Priority, NewsStatus } from "@/lib/types";
import type { InValue } from "@libsql/client";

export const runtime = "nodejs";

const PRIORITIES = ["normal", "wichtig", "dringend"] as const;
const NEWS_STATUS = ["draft", "published", "hidden", "archived"] as const;
const MAX_FEATURED = 3;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const current = await db.prepare("SELECT * FROM news WHERE id = ? AND deleted_at IS NULL").get<any>(params.id);
  if (!current) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const body = await readJson(req);
  const sets: string[] = [];
  const vals: InValue[] = [];

  if (body.title !== undefined) {
    const t = trimmed(body.title);
    if (!t) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });
    sets.push("title = ?");
    vals.push(t);
  }
  if (body.body !== undefined) {
    sets.push("body = ?");
    vals.push(str(body.body));
  }
  if (body.category !== undefined) {
    sets.push("category = ?");
    vals.push(trimmed(body.category) || "Allgemein");
  }
  if (body.priority !== undefined) {
    sets.push("priority = ?");
    vals.push(oneOf<Priority>(body.priority, PRIORITIES, "normal"));
  }
  if (body.status !== undefined) {
    const ns = oneOf<NewsStatus>(body.status, NEWS_STATUS, current.status);
    sets.push("status = ?");
    vals.push(ns);
    if (ns === "published" && !current.published_at) {
      sets.push("published_at = ?");
      vals.push(nowIso());
    }
  }
  if (body.featured !== undefined) {
    sets.push("featured = ?");
    vals.push(body.featured ? 1 : 0);
    if (body.featured_until !== undefined) {
      sets.push("featured_until = ?");
      vals.push(str(body.featured_until) || null);
    }
  }

  if (sets.length) {
    await db.prepare(`UPDATE news SET ${sets.join(", ")} WHERE id = ?`).run(...vals, params.id);
  }

  // Max. 3 beförderte News: ältestes fällt automatisch heraus (§7.4).
  if (body.featured === true) {
    const featured = await db
      .prepare(
        "SELECT id FROM news WHERE featured = 1 AND deleted_at IS NULL ORDER BY COALESCE(published_at, created_at) DESC"
      )
      .all<{ id: string }>();
    for (const n of featured.slice(MAX_FEATURED)) {
      await db.prepare("UPDATE news SET featured = 0 WHERE id = ?").run(n.id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  await getDb().prepare("UPDATE news SET deleted_at = ? WHERE id = ?").run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
