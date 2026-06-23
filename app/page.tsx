"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { TodayDigest } from "@/lib/types";
import { Card, SectionLabel, MilestoneBar, SignalDot, SkeletonList } from "@/components/ui";
import { until, relativeDay } from "@/lib/format";

export default function TodayPage() {
  const [data, setData] = useState<TodayDigest | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<TodayDigest>("/api/today")
      .then(setData)
      .catch((e) => setErr(e.message));
    const t = setInterval(() => api<TodayDigest>("/api/today").then(setData).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="sp-in pb-6">
      <header className="mb-3 flex items-baseline justify-between">
        <h1 className="font-display text-display">Heute</h1>
        <span className="text-small text-muted">{today}</span>
      </header>

      {err && <p className="text-small text-danger">{err}</p>}
      {!data && !err && <SkeletonList rows={3} />}

      {data && (
        <>
          {data.featuredNews.length > 0 && (
            <section>
              {data.featuredNews.map((n) => (
                <Link key={n.id} href="/news" className="mb-3 block">
                  <Card className="border-l-2" >
                    <div className="mb-1.5 flex items-center gap-2">
                      <SignalDot />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {n.category}
                      </span>
                    </div>
                    <h2 className="font-display text-h1 leading-tight">{n.title}</h2>
                    {n.body && <p className="mt-1.5 line-clamp-2 text-small text-muted">{n.body}</p>}
                  </Card>
                </Link>
              ))}
            </section>
          )}

          {data.urgent.length > 0 && (
            <section>
              <SectionLabel>Dringend</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {data.urgent.map((u) => (
                  <Link key={u.type + u.id} href={u.type === "poll" ? `/polls/${u.id}` : `/events/${u.id}`}>
                    <Card className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.title}</p>
                        <p className="text-[12px] text-muted">{u.type === "poll" ? "Abstimmung" : "Event"}</p>
                      </div>
                      <span className="shrink-0 text-small font-medium text-warning">{until(u.closes_at)}</span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.upcoming.length > 0 && (
            <section>
              <SectionLabel>Kommt</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {data.upcoming.map((e) => (
                  <Link key={e.id} href={`/events/${e.id}`}>
                    <Card>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{e.title}</p>
                        {e.start_at && (
                          <span className="shrink-0 text-[12px] text-muted">{relativeDay(e.start_at)}</span>
                        )}
                      </div>
                      <MilestoneBar done={e.done_count} total={e.total_count} />
                      {e.total_count > 0 && (
                        <p className="mt-1.5 text-[12px] text-muted">
                          {e.done_count} von {e.total_count} Schritten
                        </p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.openPolls.length > 0 && (
            <section>
              <SectionLabel>Offene Abstimmungen</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {data.openPolls.map((p) => (
                  <Link key={p.id} href={`/polls/${p.id}`}>
                    <Card className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.question}</p>
                        <p className="text-[12px] text-muted">
                          {p.total_ballots} {p.total_ballots === 1 ? "Stimme" : "Stimmen"}
                          {p.closes_at ? ` · ${until(p.closes_at)}` : ""}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium"
                        style={
                          p.voted
                            ? { color: "var(--success)", background: "color-mix(in srgb, var(--success) 14%, transparent)" }
                            : { color: "white", background: "var(--signal)" }
                        }
                      >
                        {p.voted ? "✓ Gewählt" : "Abstimmen"}
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.featuredNews.length === 0 &&
            data.urgent.length === 0 &&
            data.upcoming.length === 0 &&
            data.openPolls.length === 0 && (
              <Card className="mt-6 text-center text-muted">
                <p className="py-6">Nichts Dringendes. Alles im Griff. ✨</p>
              </Card>
            )}
        </>
      )}
    </div>
  );
}
