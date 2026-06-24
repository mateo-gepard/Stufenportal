"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { TodayDigest } from "@/lib/types";
import { Card, SectionLabel, MilestoneBar, SignalDot, SkeletonList } from "@/components/ui";
import { IconCalendar, IconCheck, IconClock, IconSparkle, IconTarget, IconVote } from "@/components/icons";
import { money, until, relativeDay } from "@/lib/format";

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
          <div className="mb-4 grid grid-cols-3 gap-2">
            <DigestTile icon={<IconClock size={16} />} label="Dringend" value={data.urgent.length} />
            <DigestTile icon={<IconCalendar size={16} />} label="Events" value={data.upcoming.length} />
            <DigestTile icon={<IconVote size={16} />} label="Votes" value={data.openPolls.length} />
          </div>

          {data.featuredNews.length > 0 && (
            <section>
              {data.featuredNews.map((n) => (
                <Link key={n.id} href="/news" className="mb-3 block">
                  <Card className="border-l-4 p-4" >
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
              <SectionLabel>Agenda</SectionLabel>
              <div className="relative flex flex-col gap-3 pl-4 before:absolute before:bottom-3 before:left-1 before:top-3 before:w-px before:bg-line">
                {data.urgent.map((u) => (
                  <Link key={u.type + u.id} href={u.type === "poll" ? `/polls/${u.id}` : `/events/${u.id}`} className="relative">
                    <span className="absolute -left-[18px] top-5 h-3 w-3 rounded-full border-2 border-bg bg-[color:var(--warning)]" />
                    <Card className="flex items-center justify-between p-4">
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
              <div className="flex flex-col gap-3">
                {data.upcoming.map((e) => (
                  <Link key={e.id} href={`/events/${e.id}`}>
                    <Card className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{e.title}</p>
                        {e.start_at && (
                          <span className="shrink-0 text-[12px] text-muted">{relativeDay(e.start_at)}</span>
                        )}
                      </div>
                      <MilestoneBar done={e.done_count} total={e.total_count} />
                      {e.total_count > 0 && (
                        <p className="mt-2 text-[12px] text-muted">
                          {e.done_count} von {e.total_count} Schritten
                        </p>
                      )}
                      {e.money_goal_cents ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--signal-text)]">
                          <IconTarget size={13} />
                          Kassenziel {money(e.money_goal_cents)}
                        </p>
                      ) : null}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.openPolls.length > 0 && (
            <section>
              <SectionLabel>Offene Abstimmungen</SectionLabel>
              <div className="flex flex-col gap-3">
                {data.openPolls.map((p) => (
                  <Link key={p.id} href={`/polls/${p.id}`}>
                    <Card className="flex items-center justify-between p-4">
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
                        {p.voted ? (
                          <span className="inline-flex items-center gap-1.5">
                            <IconCheck size={14} />
                            Gewählt
                          </span>
                        ) : (
                          "Abstimmen"
                        )}
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
                <div className="flex flex-col items-center gap-2 py-6">
                  <IconSparkle size={22} />
                  <p>Nichts Dringendes. Alles im Griff.</p>
                </div>
              </Card>
            )}
        </>
      )}
    </div>
  );
}

function DigestTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between text-muted">
        {icon}
        <span className="tabular text-[18px] font-semibold text-text">{value}</span>
      </div>
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-muted">{label}</p>
    </div>
  );
}
