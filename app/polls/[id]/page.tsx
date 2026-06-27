"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { PollDetail, PollResultRow } from "@/lib/types";
import { Skeleton, Button, AdminDots, BottomSheet, SheetAction } from "@/components/ui";
import { IconCheck, IconPlay, IconPlus, IconStop, IconTrash, IconVote } from "@/components/icons";

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
  const [veto, setVeto] = useState("");
  const [resultsExpanded, setResultsExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    (api(`/api/polls/${params.id}`) as Promise<{ poll: PollDetail }>)
      .then((d) => setPoll(d.poll))
      .catch(() => setNotFound(true));
  }, [params.id]);
  useEffect(load, [load]);
  useEffect(() => {
    setResultsExpanded(false);
  }, [params.id]);

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
      const requiredRankLimit = rankLimitForPoll(poll);
      if (ranking.length !== requiredRankLimit) {
        return (
          setErr(`Bitte genau ${requiredRankLimit} ${requiredRankLimit === 1 ? "Priorität" : "Prioritäten"} setzen.`),
          setBusy(false)
        );
      }
      if (poll.ranked_veto_enabled && !veto) return setErr("Bitte ein Veto wählen."), setBusy(false);
      body = poll.ranked_veto_enabled ? { ranking, veto_option_id: veto } : { ranking };
    }
    try {
      const d = (await api(`/api/polls/${params.id}/vote`, { method: "POST", body })) as { poll: PollDetail };
      setPoll(d.poll);
      setRanking([]);
      setVeto("");
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
  const visibleResults = poll.results ? (resultsExpanded ? poll.results : poll.results.slice(0, 3)) : null;
  const resultCount = poll.results?.length ?? 0;
  const hasMoreResults = resultCount > 3;
  const votedOptionIds = new Set(poll.my_choice.map((choice) => choice.option_id));
  const showVotingSurface = poll.status === "open";

  return (
    <div className="sp-in pb-6">
      {admin && (
        <div className="mb-3 flex justify-end">
          <AdminDots onClick={() => setSheet(true)} />
        </div>
      )}

      {/* Abstimmen */}
      {showVotingSurface && (
        <section className="mb-5">
          {poll.method === "single" && (
            <div className="flex flex-col gap-[12px]">
              {poll.options.map((o) => (
                <OptionRow
                  key={o.id}
                  label={o.label}
                  selected={canVote ? single === o.id : votedOptionIds.has(o.id)}
                  control="radio"
                  disabled={!canVote}
                  onClick={() => setSingle(o.id)}
                />
              ))}
            </div>
          )}

          {poll.method === "approval" && (
            <div className="flex flex-col gap-[12px]">
              {poll.options.map((o) => {
                const on = approval.includes(o.id);
                return (
                  <OptionRow
                    key={o.id}
                    label={o.label}
                    selected={canVote ? on : votedOptionIds.has(o.id)}
                    control="check"
                    disabled={!canVote}
                    onClick={() => setApproval((p) => (on ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                  />
                );
              })}
            </div>
          )}

          {poll.method === "ranked" && (
            canVote ? (
              <RankedPicker
                options={poll.options}
                ranking={ranking}
                setRanking={setRanking}
                veto={veto}
                setVeto={setVeto}
                rankLimit={rankLimitForPoll(poll)}
                vetoEnabled={poll.ranked_veto_enabled}
              />
            ) : (
              <div className="flex flex-col gap-[12px]">
                {poll.options.map((o) => (
                  <OptionRow
                    key={o.id}
                    label={o.label}
                    selected={votedOptionIds.has(o.id)}
                    control="check"
                    disabled
                    onClick={() => undefined}
                  />
                ))}
              </div>
            )
          )}

          {canVote && poll.anonymous && (
            <div className="mt-3 rounded-[18px] border border-line bg-surface p-3">
              <div className="flex gap-3 rounded-[14px] bg-[color:var(--info-soft)] px-3 py-2.5 text-[12px] leading-relaxed text-[color:var(--info)]">
                <IconVote size={18} className="mt-0.5 shrink-0" />
                <p>
                  Diese Abstimmung ist anonym. Dein Account wird nur genutzt, um eine Stimme pro Person zu sichern;
                  deine Auswahl wird nicht öffentlich mit deinem Namen verbunden.
                </p>
              </div>
            </div>
          )}

          {canVote && err && <p className="mt-3 text-small text-danger">{err}</p>}
          <VoteSubmitButton onClick={vote} disabled={busy || !canVote}>
            {busy ? "Senden…" : poll.voted ? "Stimme abgegeben" : "Stimme abgeben"}
          </VoteSubmitButton>
          <p className="mt-2 text-center text-[12px] text-muted">
            {poll.anonymous
              ? "Eine Stimme pro Account. Deine Auswahl bleibt anonym."
              : "Eine Stimme pro Account."}
          </p>
        </section>
      )}

      {/* Ergebnis */}
      <section>
        <div className="mb-[14px] flex items-center justify-between gap-3">
          <h2 className="font-display text-[24px] font-black leading-none">Ergebnis</h2>
          <span className="tabular text-small font-semibold text-muted">
            {poll.total_ballots} {poll.total_ballots === 1 ? "Stimme" : "Stimmen"}
          </span>
        </div>
        {visibleResults ? (
          <div className="flex flex-col gap-[13px]">
            {winner && <LeaderResultCard poll={poll} winner={winner} />}
            {visibleResults.map((r, i) => (
              <ResultRow key={r.option_id} poll={poll} row={r} rank={i + 1} />
            ))}
            {hasMoreResults && (
              <Button onClick={() => setResultsExpanded((v) => !v)} variant="surface" full>
                {resultsExpanded ? "Nur Top 3 anzeigen" : `Alle ${resultCount} anzeigen`}
              </Button>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-small text-muted">
            {poll.results_hidden_reason}
          </p>
        )}
      </section>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Verwalten">
        <div className="space-y-1">
          {poll.status === "open" && <SheetAction label="Vorzeitig schließen" icon={<IconStop size={18} />} onClick={() => setStatus("closed")} />}
          {poll.status !== "open" && <SheetAction label="Wieder öffnen" icon={<IconPlay size={18} />} onClick={() => setStatus("open")} />}
          <SheetAction label="In den Papierkorb" icon={<IconTrash size={18} />} danger onClick={del} />
        </div>
      </BottomSheet>
    </div>
  );
}

function LeaderResultCard({ poll, winner }: { poll: PollDetail; winner: PollResultRow }) {
  const metric =
    poll.method === "ranked"
      ? `${winner.value} Pkt${poll.ranked_veto_enabled ? ` · ${vetoLabel(winner.veto_count ?? 0)}` : ""}`
      : `${winner.value} Stimmen`;
  return (
    <div className="relative mb-1 min-h-[146px] overflow-hidden rounded-[20px] bg-[color:var(--dark)] p-[22px] pb-[46px] text-white">
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[color:var(--pop)]">
            Führt aktuell
          </p>
        </div>
        <div className="shrink-0 rounded-[14px] bg-white/8 px-3 py-2 text-right">
          <p className="tabular font-display text-[34px] font-black leading-none text-[color:var(--pop)]">{winner.pct}%</p>
          <p className="tabular text-[12px] font-extrabold text-white/70">{metric}</p>
        </div>
      </div>
      <h3 className="relative mt-[24px] break-words font-display text-[28px] font-black leading-[1.04]">
        {winner.label}
      </h3>
      <div className="absolute bottom-[20px] left-[22px] right-[22px] flex h-[10px] gap-1.5" aria-hidden>
        <span className="rounded-full bg-[color:var(--accent)]" style={{ flex: Math.max(12, winner.pct) }} />
        <span className="rounded-full bg-[color:var(--dark2)]" style={{ flex: Math.max(12, 100 - winner.pct) }} />
        <span className="w-[34px] rounded-full bg-[color:var(--warn)]" />
      </div>
    </div>
  );
}

function ResultRow({ poll, row, rank }: { poll: PollDetail; row: PollResultRow; rank: number }) {
  const isFirst = rank === 1;
  const metric =
    poll.method === "ranked"
      ? `${row.value} Pkt${poll.ranked_veto_enabled ? ` · ${vetoLabel(row.veto_count ?? 0)}` : ""}`
      : `${row.value} Stimmen`;
  return (
    <div className="pb-[5px]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span
            className="tabular mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[9px] text-[14px] font-extrabold"
            style={{
              background: isFirst ? "var(--accent)" : "var(--surface-2)",
              color: isFirst ? "white" : "var(--muted)",
            }}
          >
            {rank}
          </span>
          <span className="min-w-0 flex-1 break-words font-display text-[19px] font-black leading-[1.12]">
            {row.label}
          </span>
        </div>
        <span className="tabular max-w-[38%] shrink-0 pt-1 text-right text-[15px] font-extrabold leading-tight text-text">
          {metric}
        </span>
      </div>
      <div className="h-[10px] overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, row.pct)}%`,
            background: isFirst ? "var(--accent)" : "var(--dark)",
          }}
        />
      </div>
    </div>
  );
}

function VoteSubmitButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-[20px] flex min-h-[58px] w-full items-center justify-center rounded-[16px] px-4 text-[17px] font-extrabold transition active:scale-[0.98] disabled:cursor-default"
      style={{
        background: disabled ? "var(--line)" : "var(--accent)",
        color: disabled ? "var(--faint)" : "white",
        boxShadow: disabled ? "none" : "3px 3px 0 var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

function OptionRow({
  label,
  selected,
  control,
  disabled = false,
  onClick,
}: {
  label: string;
  selected: boolean;
  control: "radio" | "check";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={`${control === "radio" ? "Option" : "Auswahl"} ${label}`}
      className="flex min-h-[70px] w-full items-start gap-4 rounded-[16px] border bg-surface px-[18px] py-[16px] text-left transition-colors active:scale-[0.995] disabled:cursor-default disabled:opacity-100"
      style={{ borderColor: selected ? "var(--signal)" : "var(--border)" }}
    >
      <span
        className="mt-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px] border-2"
        style={{ borderColor: selected ? "var(--signal)" : "var(--border)", background: selected ? "var(--signal)" : "transparent" }}
      >
        {selected && <IconCheck size={13} strokeWidth={3.2} style={{ color: "white" }} />}
      </span>
      <span className="min-w-0 flex-1 break-words font-display text-[20px] font-black leading-[1.15]">
        {label}
      </span>
    </button>
  );
}

function RankedPicker({
  options,
  ranking,
  setRanking,
  veto,
  setVeto,
  rankLimit,
  vetoEnabled,
}: {
  options: { id: string; label: string }[];
  ranking: string[];
  setRanking: (r: string[]) => void;
  veto: string;
  setVeto: (id: string) => void;
  rankLimit: number;
  vetoEnabled: boolean;
}) {
  const unranked = options.filter((o) => !ranking.includes(o.id));
  const labelOf = (id: string) => options.find((o) => o.id === id)?.label || "";
  const limitReached = ranking.length >= rankLimit;
  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">
        Setze genau {rankLimit} {rankLimit === 1 ? "Priorität" : "Prioritäten"} in Wunschreihenfolge.
        {vetoEnabled ? " Danach wählst du genau eine Option als Veto." : ""}
      </p>
      {ranking.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {ranking.map((id, i) => (
            <div key={id} className="flex items-start gap-3 rounded-xl border px-3.5 py-3" style={{ borderColor: "var(--signal)" }}>
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{ background: "var(--signal)" }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-[15px] leading-snug">{labelOf(id)}</span>
              <button
                type="button"
                onClick={() => {
                  setRanking(ranking.filter((x) => x !== id));
                  setVeto("");
                }}
                className="shrink-0 pt-0.5 text-[12px] text-muted"
              >
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
            type="button"
            onClick={() => {
              if (limitReached && vetoEnabled) {
                setVeto(veto === o.id ? "" : o.id);
                return;
              }
              if (!limitReached) {
                setRanking([...ranking, o.id]);
                setVeto("");
              }
            }}
            disabled={limitReached && !vetoEnabled}
            className="flex min-h-[48px] w-full items-start gap-3 rounded-xl border bg-surface px-3.5 py-3 text-left disabled:opacity-55"
            style={{
              borderColor: veto === o.id ? "var(--danger)" : "var(--border)",
            }}
          >
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-muted"
              style={{
                borderColor: veto === o.id ? "var(--danger)" : "var(--border)",
                background: veto === o.id ? "var(--danger)" : "transparent",
                color: veto === o.id ? "white" : "var(--text-muted)",
              }}
            >
              {veto === o.id ? <IconCheck size={13} strokeWidth={3.2} /> : <IconPlus size={15} />}
            </span>
            <span className="min-w-0 flex-1 break-words text-[15px] leading-snug">{o.label}</span>
            {limitReached && (
              <span className="shrink-0 rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[11px] text-muted">
                {vetoEnabled ? (veto === o.id ? "Veto gesetzt" : "als Veto") : "nicht gewählt"}
              </span>
            )}
          </button>
        ))}
      </div>
      {vetoEnabled && limitReached && !veto && (
        <p className="mt-2 text-[12px] text-danger">Wähle noch eine Option als Veto.</p>
      )}
    </div>
  );
}

function rankLimitForPoll(poll: PollDetail): number {
  const max = Math.max(1, poll.options.length - (poll.ranked_veto_enabled ? 1 : 0));
  if (!poll.rank_limit) return max;
  return Math.min(Math.max(1, poll.rank_limit), max);
}

function vetoLabel(count: number): string {
  return `${count} ${count === 1 ? "Veto" : "Vetos"}`;
}
