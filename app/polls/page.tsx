"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { PollMethod, PollStatus } from "@/lib/types";
import { Card, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Textarea, Select, Toggle } from "@/components/form";
import { IconPlus, IconUser } from "@/components/icons";
import { appDateTimeLocalToIso, formatAppDate } from "@/lib/time";

interface PollListItem {
  id: string;
  question: string;
  method: PollMethod;
  anonymous: boolean;
  rank_limit: number | null;
  ranked_veto_enabled: boolean;
  status: PollStatus;
  closes_at: string | null;
  total_ballots: number;
  voted: boolean;
}

const methodLabel: Record<PollMethod, string> = {
  single: "Single",
  approval: "Mehrfach",
  ranked: "Ranking",
};

const ELIGIBLE_VOTERS = 99;
const TURNOUT_DOTS = 30;

export default function PollsPage() {
  const { admin } = useApp();
  const [polls, setPolls] = useState<PollListItem[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    (api("/api/polls") as Promise<{ polls: PollListItem[] }>)
      .then((d) => setPolls(d.polls))
      .catch(() => setPolls([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="sp-in pb-6">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="sp-section-kicker">Stufenportal</p>
          <h1 className="sp-page-title">Abstimmungen</h1>
        </div>
        {admin && (
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={17} />
            Neu
          </Button>
        )}
      </header>

      {!polls && <SkeletonList rows={3} />}
      {polls && polls.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">Noch keine Abstimmungen.</p>
        </Card>
      )}

      <div className="sp-stagger flex flex-col gap-[14px]">
        {polls?.map((p) => (
          <Link key={p.id} href={`/polls/${p.id}`} className="block">
            <VoteCard poll={p} />
          </Link>
        ))}
      </div>

      {admin && (
        <CreatePollSheet
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function VoteCard({ poll }: { poll: PollListItem }) {
  const turnout = turnoutFor(poll.total_ballots);
  const isClosed = poll.status !== "open";
  return (
    <article
      className={`rounded-[20px] border border-line bg-surface p-[22px] shadow-[0_1px_0_rgba(17,51,61,0.03)] transition active:scale-[0.995] ${
        isClosed ? "opacity-60" : ""
      }`}
    >
      <div className="mb-[15px] flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <MetaChip tone="blue">
            {methodLabel[poll.method]}
            {poll.method === "ranked" && poll.rank_limit ? ` ${poll.rank_limit}` : ""}
          </MetaChip>
          {poll.ranked_veto_enabled && <MetaChip tone="plain">1 Veto</MetaChip>}
          {poll.anonymous && (
            <MetaChip tone="plain">
              <IconUser size={12} strokeWidth={2.2} />
              Anonym
            </MetaChip>
          )}
          {poll.voted && poll.status === "open" && <MetaChip tone="success">Abgestimmt</MetaChip>}
        </div>
        <DeadlineBadge poll={poll} />
      </div>

      <h2 className="mb-[14px] font-display text-[24px] font-black leading-[1.02] text-text">{poll.question}</h2>
      <TurnoutDots pct={turnout.pct} muted={isClosed} />
      <p className="mt-3 tabular text-[13px] font-extrabold text-muted">
        {poll.total_ballots} von {turnout.total} Stimmen · {turnout.pct}%
      </p>
    </article>
  );
}

function MetaChip({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "blue" | "plain" | "success";
}) {
  const styles = {
    blue: { background: "var(--info-soft)", color: "var(--info)" },
    plain: { background: "var(--surface-2)", color: "var(--text-muted)" },
    success: { background: "var(--ok-soft)", color: "var(--success)" },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em]"
      style={styles}
    >
      {children}
    </span>
  );
}

function DeadlineBadge({ poll }: { poll: PollListItem }) {
  if (poll.status !== "open") {
    return (
      <span className="shrink-0 rounded-[9px] border border-line bg-surface px-2.5 py-1 text-[12px] font-extrabold text-muted">
        beendet
      </span>
    );
  }
  if (!poll.closes_at) return null;
  return (
    <span className="shrink-0 rounded-[9px] border border-[color:var(--pop)] bg-[color:var(--warn-soft)] px-2.5 py-1 text-[12px] font-extrabold text-text">
      {deadlineLabel(poll.closes_at)}
    </span>
  );
}

function TurnoutDots({ pct, muted }: { pct: number; muted: boolean }) {
  const active = pct <= 0 ? 0 : Math.max(1, Math.round((pct / 100) * TURNOUT_DOTS));
  return (
    <div className="flex max-w-full flex-wrap gap-[4px]" aria-hidden>
      {Array.from({ length: TURNOUT_DOTS }).map((_, i) => (
        <span
          key={i}
          className="h-[7px] w-[7px] rounded-[2px]"
          style={{
            background:
              i < active
                ? muted
                  ? "color-mix(in srgb, var(--accent) 58%, var(--line))"
                  : "var(--accent)"
                : "var(--line)",
          }}
        />
      ))}
    </div>
  );
}

function turnoutFor(ballots: number) {
  const total = Math.max(ELIGIBLE_VOTERS, ballots);
  const pct = total > 0 ? Math.min(100, Math.round((ballots / total) * 100)) : 0;
  return { total, pct };
}

function deadlineLabel(iso: string): string {
  const weekday = formatAppDate(iso, { weekday: "short" }).replace(".", "");
  const time = formatAppDate(iso, { hour: "2-digit", minute: "2-digit" });
  return `bis ${weekday} ${time}`;
}

function CreatePollSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [method, setMethod] = useState<PollMethod>("single");
  const [optionsText, setOptionsText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [rankLimit, setRankLimit] = useState("2");
  const [rankVeto, setRankVeto] = useState(false);
  const [reveal, setReveal] = useState("live");
  const [closes, setCloses] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const optionCount = optionsText.split("\n").map((l) => l.trim()).filter(Boolean).length;
  const rankMax = Math.max(1, optionCount - (rankVeto ? 1 : 0));

  useEffect(() => {
    if (method !== "ranked") return;
    setRankLimit((current) => {
      const n = parseInt(current, 10);
      if (!n || n < 1) return "1";
      if (n > rankMax) return String(rankMax);
      return current;
    });
  }, [method, rankMax]);

  async function submit() {
    const options = optionsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!question.trim()) return setErr("Frage fehlt.");
    if (options.length < 2) return setErr("Mindestens 2 Optionen (eine pro Zeile).");
    const currentRankMax = Math.max(1, options.length - (rankVeto ? 1 : 0));
    const rankLimitNumber = parseInt(rankLimit, 10);
    if (method === "ranked" && (!rankLimitNumber || rankLimitNumber < 1 || rankLimitNumber > currentRankMax)) {
      return setErr(`Anzahl Prios muss zwischen 1 und ${currentRankMax} liegen.`);
    }
    setBusy(true);
    setErr("");
    try {
      await api("/api/polls", {
        method: "POST",
        body: {
          question: question.trim(),
          method,
          options,
          rank_limit: method === "ranked" ? rankLimitNumber : null,
          ranked_veto_enabled: method === "ranked" && rankVeto,
          anonymous,
          reveal: anonymous ? reveal : "live",
          closes_at: closes ? appDateTimeLocalToIso(closes) : null,
        },
      });
      setQuestion("");
      setOptionsText("");
      setAnonymous(false);
      setRankLimit("2");
      setRankVeto(false);
      setCloses("");
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Neue Abstimmung">
      <Field label="Frage">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="z. B. Welches Abimotto?" />
      </Field>
      <Field label="Methode">
        <Select value={method} onChange={(e) => setMethod(e.target.value as PollMethod)}>
          <option value="single">Eine Wahl (Single Choice)</option>
          <option value="approval">Mehrfachauswahl (Approval)</option>
          <option value="ranked">Rangfolge (Ranked / Borda)</option>
        </Select>
      </Field>
      <Field label="Optionen" hint="Eine pro Zeile.">
        <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={"Option A\nOption B\nOption C"} />
      </Field>
      {method === "ranked" && (
        <div className="mb-3 rounded-xl border border-line bg-surface p-3">
          <Field
            label="Anzahl Prios"
            hint={`${optionCount || 0} Optionen erkannt. Maximal ${rankMax}${rankVeto ? " mit Veto" : ""}.`}
          >
            <Select value={rankLimit} onChange={(e) => setRankLimit(e.target.value)}>
              {Array.from({ length: rankMax }).map((_, i) => {
                const n = i + 1;
                return (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Toggle checked={rankVeto} onChange={setRankVeto} label="Veto aktivieren" />
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Bei Veto wählt jede Person zusätzlich genau eine Option als Veto. Die Vetos werden separat gezählt
            und nicht von den Punkten abgezogen.
          </p>
        </div>
      )}
      <Field label="Frist (Berlin, optional)">
        <Input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
      </Field>
      <div className="mb-3">
        <Toggle checked={anonymous} onChange={setAnonymous} label="Anonym abstimmen" />
      </div>
      {anonymous && (
        <Field label="Ergebnis zeigen">
          <Select value={reveal} onChange={(e) => setReveal(e.target.value)}>
            <option value="after_close">Erst nach Schluss</option>
            <option value="live">Live</option>
          </Select>
        </Field>
      )}
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={submit} disabled={busy} full>
        {busy ? "Speichern…" : "Abstimmung erstellen"}
      </Button>
    </BottomSheet>
  );
}
