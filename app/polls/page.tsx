"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { PollMethod, PollStatus } from "@/lib/types";
import { Card, PollStatusPill, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Textarea, Select, Toggle } from "@/components/form";
import { IconCheck } from "@/components/icons";
import { until } from "@/lib/format";

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
  single: "Eine Wahl",
  approval: "Mehrfachauswahl",
  ranked: "Rangfolge",
};

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
      <header className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-display">Abstimmungen</h1>
        {admin && <Button onClick={() => setOpen(true)}>+ Neu</Button>}
      </header>

      {!polls && <SkeletonList rows={3} />}
      {polls && polls.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">Noch keine Abstimmungen.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {polls?.map((p) => (
          <Link key={p.id} href={`/polls/${p.id}`}>
            <Card>
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <h2 className="font-medium leading-snug">{p.question}</h2>
                <PollStatusPill status={p.status} />
              </div>
              <div className="flex items-center justify-between text-[12px] text-muted">
                <span>
                  {methodLabel[p.method]}
                  {p.method === "ranked" && p.rank_limit ? ` · Top ${p.rank_limit}` : ""}
                  {p.ranked_veto_enabled ? " · Veto" : ""}
                  {p.anonymous ? " · anonym" : ""} · {p.total_ballots} {p.total_ballots === 1 ? "Stimme" : "Stimmen"}
                </span>
                {p.status === "open" && p.closes_at && <span>{until(p.closes_at)}</span>}
              </div>
              {p.voted && p.status === "open" && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
                  <IconCheck size={13} />
                  Du hast abgestimmt
                </p>
              )}
            </Card>
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
          closes_at: closes ? new Date(closes).toISOString() : null,
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
            Bei Veto bekommen nicht priorisierte Optionen einen Veto-Abzug. Deshalb kannst du höchstens eine
            Option weniger priorisieren als es Möglichkeiten gibt.
          </p>
        </div>
      )}
      <Field label="Frist (optional)">
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
