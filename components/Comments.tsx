"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import type { Comment } from "@/lib/types";
import { Input } from "@/components/form";
import { Button } from "@/components/ui";
import { dateTime } from "@/lib/format";

export default function Comments({ type, id }: { type: "event" | "news"; id: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    (api(`/api/comments?type=${type}&id=${id}`) as Promise<{ comments: Comment[] }>)
      .then((d) => setComments(d.comments))
      .catch(() => {});
  }, [type, id]);
  useEffect(load, [load]);

  useEffect(() => {
    const saved = localStorage.getItem("sp_name");
    if (saved) setName(saved);
  }, []);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      if (name.trim()) localStorage.setItem("sp_name", name.trim());
      await api("/api/comments", {
        method: "POST",
        body: { target_type: type, target_id: id, author_name: name, body },
      });
      setBody("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function del(cid: string) {
    await api(`/api/comments/${cid}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="mt-6">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Kommentare {comments.length > 0 && `· ${comments.length}`}
      </h3>
      <div className="space-y-2.5">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-small font-medium">{c.author_name}</span>
              <span className="text-[11px] text-muted">{dateTime(c.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-small">{c.body}</p>
            {c.mine && (
              <button onClick={() => del(c.id)} className="mt-1 text-[12px] text-danger">
                Löschen
              </button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-small text-muted">Noch keine Kommentare.</p>}
      </div>

      <div className="mt-3 space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name (optional)" maxLength={40} />
        <div className="flex gap-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kommentar schreiben…" />
          <Button onClick={send} disabled={busy || !body.trim()}>
            Senden
          </Button>
        </div>
      </div>
    </section>
  );
}
