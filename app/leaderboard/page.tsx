"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { LeaderboardRow, MemberRow } from "@/lib/types";
import { Card, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Select } from "@/components/form";
import { IconChevronLeft, IconMedal, IconPlus, IconTrophy } from "@/components/icons";

export default function LeaderboardPage() {
  const { admin } = useApp();
  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);
  const [award, setAward] = useState(false);

  const load = useCallback(() => {
    (api("/api/leaderboard") as Promise<{ board: LeaderboardRow[] }>)
      .then((d) => setBoard(d.board))
      .catch(() => setBoard([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="sp-in pb-6">
      <Link href="/more" className="mb-2 inline-flex items-center gap-1 text-small text-muted">
        <IconChevronLeft size={15} />
        Mehr
      </Link>
      <header className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-display">Leaderboard</h1>
        {admin && (
          <Button onClick={() => setAward(true)}>
            <IconPlus size={17} />
            Punkte
          </Button>
        )}
      </header>
      <p className="mb-4 text-small text-muted">Punkte fürs Mitmachen. Wer hier steht, hat sich freiwillig sichtbar gemacht.</p>

      {!board && <SkeletonList rows={3} />}
      {board && board.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">
            Noch ist niemand sichtbar.
            <br />
            <Link href="/more" className="mt-2 inline-block text-signal-text">
              In „Mehr" aktivieren
            </Link>
          </p>
        </Card>
      )}

      {board && board.length > 0 && (
        <div className="mb-4 grid grid-cols-3 items-end gap-2">
          {board.slice(0, 3).map((row, index) => (
            <PodiumCard key={row.rank + row.name} row={row} place={index + 1} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {board?.map((row) => (
          <Card
            key={row.rank + row.name}
            className="flex items-center gap-3.5 p-4"
            style={row.mine ? { borderColor: "var(--signal)" } : undefined}
          >
            <span
              className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
              style={{
                background: row.rank <= 3 ? "color-mix(in srgb, var(--signal) 14%, transparent)" : "var(--surface-2)",
                color: row.rank <= 3 ? "var(--signal-text)" : "var(--text-muted)",
              }}
            >
              {row.rank <= 3 ? <IconMedal size={18} /> : row.rank}
            </span>
            <span className="flex-1 truncate font-medium">
              {row.name}
              {row.mine && <span className="ml-1.5 text-[12px] text-muted">(du)</span>}
            </span>
            <span className="tabular font-display text-h2">{row.points}</span>
          </Card>
        ))}
      </div>

      {admin && <AwardSheet open={award} onClose={() => setAward(false)} onDone={() => { setAward(false); load(); }} />}
    </div>
  );
}

function PodiumCard({ row, place }: { row: LeaderboardRow; place: number }) {
  const heights: Record<number, string> = { 1: "min-h-[132px]", 2: "min-h-[112px]", 3: "min-h-[100px]" };
  return (
    <Card
      className={`${heights[place]} flex flex-col items-center justify-end p-3 text-center`}
      style={row.mine ? { borderColor: "var(--signal)" } : undefined}
    >
      <span
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          color: place === 1 ? "white" : "var(--signal-text)",
          background: place === 1 ? "var(--signal)" : "color-mix(in srgb, var(--signal) 14%, transparent)",
        }}
      >
        {place === 1 ? <IconTrophy size={18} /> : <IconMedal size={18} />}
      </span>
      <p className="line-clamp-2 text-small font-medium">{row.name}</p>
      <p className="tabular font-display text-h2">{row.points}</p>
    </Card>
  );
}

function AwardSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [device, setDevice] = useState("");
  const [points, setPoints] = useState("5");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    (api("/api/members") as Promise<{ members: MemberRow[] }>)
      .then((d) => {
        setMembers(d.members);
        if (d.members[0]) setDevice(d.members[0].device_id);
      })
      .catch(() => setMembers([]));
  }, [open]);

  async function submit() {
    if (!device) return setErr("Kein Mitglied wählbar.");
    const p = parseInt(points, 10);
    if (!p) return setErr("Punktzahl fehlt.");
    setBusy(true);
    setErr("");
    try {
      await api("/api/points", { method: "POST", body: { device_id: device, points: p, reason } });
      setReason("");
      setPoints("5");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Punkte vergeben">
      {members.length === 0 ? (
        <p className="py-4 text-small text-muted">
          Noch keine bekannten Mitglieder. Sobald sich jemand mit Namen einträgt oder kommentiert, erscheint er hier.
        </p>
      ) : (
        <>
          <Field label="An wen">
            <Select value={device} onChange={(e) => setDevice(e.target.value)}>
              {members.map((m) => (
                <option key={m.device_id} value={m.device_id}>
                  {m.name} · {m.points} Pkt
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Punkte" hint="Negativ zum Korrigieren möglich.">
            <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
          </Field>
          <Field label="Grund (optional)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. Standdienst übernommen" maxLength={120} />
          </Field>
          {err && <p className="mb-2 text-small text-danger">{err}</p>}
          <Button onClick={submit} disabled={busy} full>
            {busy ? "Speichern…" : "Punkte vergeben"}
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
