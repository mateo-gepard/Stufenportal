"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { PollDetail } from "@/lib/types";
import { Skeleton, PollStatusPill, Button, AdminDots, BottomSheet, SheetAction } from "@/components/ui";
import { until, dateTime } from "@/lib/format";

export default function PollDetailPage({ params }: { params: { id: string } }) {
  const { admin } = useApp();
  const router = useRouter();
  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Auswahl-State
  const [single, setSingle] = useState("");
  const [approval, setApproval] = useState<string[]>([]);
  const [ranking, setRanking] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    (api(`/api/polls/${params.id}`) as Promise<{ poll: PollDetail }>)
      .then((d) => setPoll(d.poll))
      .catch(() => setNotFound(true));
  }, [params.id]);
  useEffect(load, [load]);

  async function vote() {
    if (!poll) return;
    setBusy(true);
    setErr("");
    let body: Record<string, unknown> = {};
    if (poll.method === "single") {
      if (!single) return setErr("Bitte eine Option wählen."), setBusy(false);
      body = { option_id: single };
    } else if (poll.method === "approval") {
      if (approval.length === 0) return setErr("Bitte mindestens eine Option."), setBusy(false);
      body = { option_ids: approval };
    } else {
      if (ranking.length === 0) return setErr("Bitte eine Reihenfolge wählen."), setBusy(false);
      body = { ranking };
    }
    try {
      const d = (await api(`/api/polls/${params.id}/vote`, { method: "POST", body })) as { poll: PollDetail };
      setPoll(d.poll);
    } catch (e) {
      setErr((e as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    await api(`/api/polls/${params.id}`, { method: "PATCH", body: { status } });
    setSheet(false);
    load();
  }
  async function del() {
    await api(`/api/polls/${params.id}`, { method: "DELETE" });
    router.push("/polls");
  }

  if (notFound)
    return (
      <div className="sp-in pt-10 text-center text-muted">
        <p>Abstimmung nicht gefunden.</p>
        <Link href="/polls" className="mt-3 inline-block text-signal-text">Zurück</Link>
      </div>
    );
  if (!poll)
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  const canVote = poll.status === "open" && !poll.voted;
  const winner = poll.results && poll.results.length > 0 ? poll.results[0] : null;

  return (
    <div className="sp-in pb-6">
      <Link href="/polls" className="mb-2 inline-flex items-center gap-1 text-small text-muted">← Abstimmungen</Link>

      <header className="mb-3 flex items-start justify-between gap-3">
        <h1 className="font-display text-h1 leading-tight">{poll.question}</h1>
        {admin && <AdminDots onClick={() => setSheet(true)} />}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-small text-muted">
        <PollStatusPill status={poll.status} />
        {poll.anonymous && <span>· anonym</span>}
        <span>· {poll.total_ballots} {poll.total_ballots === 1 ? "Stimme" : "Stimmen"}</span>
        {poll.status === "open" && poll.closes_at && <span>· {until(poll.closes_at)}</span>}
      </div>

      {/* Abstimmen */}
      {canVote && (
        <section className="mb-5">
          {poll.method === "single" && (
            <div className="flex flex-col gap-2">
              {poll.options.map((o) => (
                <OptionRow
                  key={o.id}
                  label={o.label}
                  selected={single === o.id}
                  control="radio"
                  onClick={() => setSingle(o.id)}
                />
              ))}
            </div>
          )}

          {poll.method === "approval" && (
            <div className="flex flex-col gap-2">
              {poll.options.map((o) => {
                const on = approval.includes(o.id);
                return (
                  <OptionRow
                    key={o.id}
                    label={o.label}
                    selected={on}
                    control="check"
                    onClick={() => setApproval((p) => (on ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                  />
                );
              })}
            </div>
          )}

          {poll.method === "ranked" && (
            <RankedPicker options={poll.options} ranking={ranking} setRanking={setRanking} />
          )}

          {err && <p className="mt-3 text-small text-danger">{err}</p>}
          <Button onClick={vote} disabled={busy} full>
            {busy ? "Senden…" : "Stimme abgeben"}
          </Button>
          <p className="mt-2 text-center text-[12px] text-muted">
            Eine Stimme pro Gerät. {poll.anonymous ? "Anonym — niemand sieht, wie du stimmst." : ""}
          </p>
        </section>
      )}

      {poll.voted && poll.status === "open" && (
        <div
          className="mb-5 rounded-xl px-4 py-3 text-small font-medium"
          style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)" }}
        >
          ✓ Du hast abgestimmt. Danke!
        </div>
      )}

      {/* Ergebnis */}
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Ergebnis</h2>
        {poll.results ? (
          <div className="flex flex-col gap-2.5">
            {poll.results.map((r, i) => (
              <div key={r.option_id} className="rounded-lg border border-line bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    {i === 0 && winner && winner.value > 0 && poll.status !== "open" && (
                      <span style={{ color: "var(--signal-text)" }}>★</span>
                    )}
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="tabular shrink-0 text-small text-muted">
                    {poll.method === "ranked" ? `${r.value} Pkt` : `${r.value} · ${r.pct}%`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, r.pct)}%`, background: i === 0 ? "var(--signal)" : "color-mix(in srgb, var(--signal) 55%, var(--surface-2))" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-small text-muted">
            {poll.results_hidden_reason}
          </p>
        )}
      </section>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Verwalten">
        <div className="space-y-1">
          {poll.status === "open" && <SheetAction label="Vorzeitig schließen" icon="⏹" onClick={() => setStatus("closed")} />}
          {poll.status !== "open" && <SheetAction label="Wieder öffnen" icon="▶" onClick={() => setStatus("open")} />}
          <SheetAction label="In den Papierkorb" icon="🗑" danger onClick={del} />
        </div>
      </BottomSheet>
    </div>
  );
}

function OptionRow({
  label,
  selected,
  control,
  onClick,
}: {
  label: string;
  selected: boolean;
  control: "radio" | "check";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border bg-surface px-3.5 text-left transition-colors"
      style={{ borderColor: selected ? "var(--signal)" : "var(--border)" }}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${control === "radio" ? "rounded-full" : "rounded-md"}`}
        style={{ borderColor: selected ? "var(--signal)" : "var(--border)", background: selected ? "var(--signal)" : "transparent" }}
      >
        {selected && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 9 17.5 20 6.5" />
          </svg>
        )}
      </span>
      <span className="text-[15px]">{label}</span>
    </button>
  );
}

function RankedPicker({
  options,
  ranking,
  setRanking,
}: {
  options: { id: string; label: string }[];
  ranking: string[];
  setRanking: (r: string[]) => void;
}) {
  const unranked = options.filter((o) => !ranking.includes(o.id));
  const labelOf = (id: string) => options.find((o) => o.id === id)?.label || "";
  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">Tippe in deiner Wunschreihenfolge — Platz 1 zuerst.</p>
      {ranking.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {ranking.map((id, i) => (
            <div key={id} className="flex items-center gap-3 rounded-xl border px-3.5 py-3" style={{ borderColor: "var(--signal)" }}>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{ background: "var(--signal)" }}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-[15px]">{labelOf(id)}</span>
              <button onClick={() => setRanking(ranking.filter((x) => x !== id))} className="text-[12px] text-muted">
                entfernen
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {unranked.map((o) => (
          <button
            key={o.id}
            onClick={() => setRanking([...ranking, o.id])}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-left"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-muted" style={{ borderColor: "var(--border)" }}>
              +
            </span>
            <span className="text-[15px]">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
