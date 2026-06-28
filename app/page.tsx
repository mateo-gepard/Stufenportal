"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { TodayDigest } from "@/lib/types";
import { Card, SkeletonList } from "@/components/ui";
import WeekTimeline from "@/components/WeekTimeline";
import { IconCheck, IconSparkle } from "@/components/icons";
import { until } from "@/lib/format";
import { appDateParts, appHour, appMonthShort, formatAppDate } from "@/lib/time";
import { useCountUp } from "@/lib/useCountUp";

export default function TodayPage() {
  const { user } = useApp();
  const [data, setData] = useState<TodayDigest | null>(null);
  const [err, setErr] = useState("");
  const [homeView, setHomeView] = useState<"heute" | "woche">("heute");

  useEffect(() => {
    const load = () => api<TodayDigest>("/api/today").then(setData).catch(() => {});
    api<TodayDigest>("/api/today")
      .then(setData)
      .catch((e) => setErr(e.message));
    // Nur pollen, wenn der Tab sichtbar ist (spart Akku/Requests im Hintergrund).
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const todayLabel = formatAppDate(Date.now(), { weekday: "short", day: "numeric", month: "short" });
  const hour = appHour();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Mittag" : "Guten Abend";
  const firstName = user?.display_name.split(/\s+/)[0];
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <div className="sp-in pb-6">
      {err && <p className="text-small text-danger">{err}</p>}
      {!data && !err && <SkeletonList rows={3} />}

      {data && (
        <>
          <header className="pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">
                <span className="h-2.5 w-2.5 rotate-45 bg-[color:var(--accent)]" />
                Stufenportal - Abi '27
              </div>
              <div className="-rotate-2 rounded-[9px] border-2 border-[color:var(--ink)] bg-[color:var(--pop)] px-2.5 py-1 font-display text-[12px] font-extrabold text-[color:var(--ink)] shadow-[2px_2px_0_var(--ink)]">
                {todayLabel}
              </div>
            </div>
            <h1 className="sp-display mt-4 text-[38px] leading-[0.98]">
              <span className="bg-[linear-gradient(transparent_58%,var(--pop)_58%)] px-0.5">{greetingText}</span>
            </h1>
          </header>

          <div className="mt-5">
            <div className="grid grid-cols-2 gap-1 rounded-[15px] border border-line bg-surface p-1">
              <HomeToggleButton active={homeView === "heute"} onClick={() => setHomeView("heute")}>
                Heute
              </HomeToggleButton>
              <HomeToggleButton active={homeView === "woche"} onClick={() => setHomeView("woche")}>
                Diese Woche
              </HomeToggleButton>
            </div>

            {homeView === "heute" ? (
              <div className="sp-in sp-hero-dark relative mt-3 overflow-hidden rounded-[22px] px-1 py-[18px]">
                <div className="sp-half absolute -right-3 -top-3 h-[90px] w-[90px] text-white/15" />
                <div className="absolute left-[18px] top-3.5 text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-50">Die Lage heute</div>
                <div className="mt-6 flex">
                  <KpiLink href="/polls" value={data.openPolls.length} label="offene Votes" pop />
                  <Divider />
                  <KpiLink href="/events" value={data.upcoming.length} label="Events bald" />
                  <Divider />
                  <div className="flex flex-1 flex-col items-center gap-1 text-center">
                    <CountUpText value={data.urgent.length} className="font-display text-[42px] font-extrabold leading-[0.9] text-[color:var(--accent)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.04em] opacity-75">dringend</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sp-in mt-3">
                <WeekTimeline events={data.upcoming} polls={data.openPolls} embedded />
              </div>
            )}
          </div>

          {data.featuredNews.length > 0 && (
            <section className="mt-[30px]">
              <div className="relative">
                <div className="absolute left-3.5 top-[-12px] z-10 inline-flex -rotate-2 items-center gap-1.5 rounded-lg border-2 border-[color:var(--ink)] bg-[color:var(--pop)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[color:var(--ink)] shadow-[2px_2px_0_var(--ink)]">
                  Angepinnt
                </div>
                <Link href="/news" className="sp-hero-dark relative block overflow-hidden rounded-[22px] px-5 pb-5 pt-7 transition active:scale-[0.99]">
                  <div className="sp-half absolute -bottom-4 -right-4 h-[120px] w-[120px] text-white/15" />
                  <span className="relative inline-block rounded-md bg-[color:var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    {data.featuredNews[0].category}
                  </span>
                  <h2 className="sp-display relative mt-3 text-[23px] leading-[1.08]">{data.featuredNews[0].title}</h2>
                  {data.featuredNews[0].body && <p className="relative mt-2 line-clamp-2 text-[13.5px] leading-[1.45] opacity-80">{data.featuredNews[0].body}</p>}
                  <div className="relative mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--pop)]">
                    Anschauen
                    <span aria-hidden>→</span>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {data.urgent.length > 0 && (
            <section className="mt-7">
              <SectionHeading num="01" title="Dringend" />
              <div className="sp-stagger flex flex-col gap-0">
                {data.urgent.map((u) => (
                  <Link key={u.type + u.id} href={urgentHref(u)} className="flex items-stretch gap-3.5 pb-3 transition active:scale-[0.99]">
                    <DateBubble iso={u.closes_at} />
                    <Card className="flex flex-1 items-center justify-between gap-2 rounded-2xl p-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-bold">{u.title}</p>
                        <p className="text-[12px] text-muted">{urgentTypeLabel(u.type)}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-[color:var(--accent)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white">
                        {u.type === "news" ? "Dringend" : until(u.closes_at)}
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.openPolls.length > 0 && (
            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <SectionHeading num="02" title="Die Stufe stimmt ab" compact />
                <Link href="/polls" className="text-[12.5px] font-bold text-[color:var(--accent)]">Alle</Link>
              </div>
              <div className="sp-stagger flex flex-col gap-3">
                {data.openPolls.map((p) => (
                  <Link key={p.id} href={`/polls/${p.id}`} className="block transition active:scale-[0.99]">
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[color:var(--info-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--info)]">Vote</span>
                        {p.closes_at && <span className="ml-auto rounded-md border border-[color:var(--pop)] bg-[color:var(--pop-soft)] px-2 py-1 text-[11px] font-bold text-text">{until(p.closes_at)}</span>}
                      </div>
                      <p className="mt-3 text-[15.5px] font-bold leading-tight">{p.question}</p>
                      <VoteDots count={Math.min(30, Math.max(1, p.total_ballots || 1))} active={Math.min(30, p.total_ballots)} />
                      <p className="mt-2 text-[11.5px] font-semibold text-muted">
                        {p.total_ballots} {p.total_ballots === 1 ? "Stimme" : "Stimmen"}
                        {p.voted && (
                          <span className="ml-2 inline-flex items-center gap-1 text-success">
                            <IconCheck size={12} />
                            Abgestimmt
                          </span>
                        )}
                      </p>
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

function KpiLink({ href, value, label, pop }: { href: string; value: number; label: string; pop?: boolean }) {
  const n = useCountUp(value);
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-1 text-center text-[color:var(--paper)] transition active:scale-[0.96]">
      <span className={`font-display text-[42px] font-extrabold leading-[0.9] ${pop ? "text-[color:var(--pop)]" : ""}`}>{Math.round(n)}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] opacity-75">{label}</span>
    </Link>
  );
}

function CountUpText({ value, className }: { value: number; className?: string }) {
  const n = useCountUp(value);
  return <span className={className}>{Math.round(n)}</span>;
}

function HomeToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="min-h-[40px] rounded-[12px] text-[13px] font-extrabold transition active:scale-[0.98]"
      style={{
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--paper)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}

function urgentHref(item: TodayDigest["urgent"][number]): string {
  if (item.type === "poll") return `/polls/${item.id}`;
  if (item.type === "event") return `/events/${item.id}`;
  return "/news";
}

function urgentTypeLabel(type: TodayDigest["urgent"][number]["type"]): string {
  if (type === "poll") return "Abstimmung";
  if (type === "event") return "Event";
  return "News";
}

function Divider() {
  return <div className="w-px self-stretch bg-[color:var(--paper)] opacity-20" />;
}

function SectionHeading({ num, title, compact }: { num: string; title: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mb-3"}`}>
      <span className="font-display text-[13px] font-extrabold text-[color:var(--accent)]">{num}</span>
      <h2 className="font-display text-[18px] font-extrabold">{title}</h2>
    </div>
  );
}

function DateBubble({ iso }: { iso: string }) {
  const parts = appDateParts(iso);
  return (
    <div className="flex w-[54px] shrink-0 flex-col items-center">
      <div className="flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full border-[2.5px] border-[color:var(--ink)] bg-[color:var(--paper)] leading-none">
        <span className="font-display text-[21px] font-extrabold">{String(parts.day).padStart(2, "0")}</span>
        <span className="text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-muted">{appMonthShort(iso)}</span>
      </div>
      <div className="my-1 w-[2px] flex-1 rounded-full bg-[color:var(--line-ink)] opacity-50" />
    </div>
  );
}

function VoteDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="mt-3 flex flex-wrap gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="h-2 w-2 rounded-sm" style={{ background: i < active ? "var(--accent)" : "var(--line-ink)" }} />
      ))}
    </div>
  );
}
