"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { LeaderboardRow, MemberRow } from "@/lib/types";
import { Card, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input } from "@/components/form";
import { IconPlus } from "@/components/icons";
import AccountMultiSelect from "@/components/AccountMultiSelect";

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
      <div className="mb-7 flex items-start justify-between gap-4">
        <p className="max-w-[285px] text-[17px] font-medium leading-[1.5] text-muted">
          Standardmäßig sichtbar, aber freiwillig. Du kannst dich im Mehr-Tab ausblenden; Sprecher vergeben Punkte mit Grund.
        </p>
        {admin && (
          <Button onClick={() => setAward(true)} variant="surface">
            <IconPlus size={17} />
            Punkte
          </Button>
        )}
      </div>

      {!board && <SkeletonList rows={3} />}
      {board && board.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">
            Aktuell ist niemand sichtbar.
            <br />
            <Link href="/more" className="mt-2 inline-block text-signal-text">
              Sichtbarkeit in „Mehr" prüfen
            </Link>
          </p>
        </Card>
      )}

      {board && board.length > 0 && (
        <LeaderboardPodium board={board} />
      )}

      <div className="divide-y divide-line">
        {board?.slice(3).map((row) => (
          <LeaderboardListRow key={row.rank + row.name} row={row} />
        ))}
      </div>

      {admin && <AwardSheet open={award} onClose={() => setAward(false)} onDone={() => { setAward(false); load(); }} />}
    </div>
  );
}

function podiumSlots(board: LeaderboardRow[]) {
  const top = board.slice(0, 3);
  return [top[1] ?? null, top[0] ?? null, top[2] ?? null];
}

function LeaderboardPodium({ board }: { board: LeaderboardRow[] }) {
  return (
    <section className="mb-[28px]">
      <div className="grid min-h-[244px] grid-cols-3 items-end gap-2">
        {podiumSlots(board).map((row, index) => (
          <PodiumSpot key={row ? row.rank + row.name : `empty-${index}`} row={row} visualSlot={index} />
        ))}
      </div>
      <div className="h-[3px] rounded-full bg-[color:var(--ink)]" />
    </section>
  );
}

function PodiumSpot({ row, visualSlot }: { row: LeaderboardRow | null; visualSlot: number }) {
  const heights = ["h-[76px]", "h-[106px]", "h-[64px]"];
  if (!row) return <div aria-hidden />;
  const isFirst = row.rank === 1;
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div
        className="mb-2 flex h-[56px] w-[56px] items-center justify-center rounded-full border-[3px] text-[18px] font-display font-black"
        style={{
          borderColor: "var(--ink)",
          background: isFirst ? "var(--pop)" : "var(--paper)",
          color: "var(--ink)",
          outline: row.mine ? "2px solid var(--accent)" : undefined,
          outlineOffset: 3,
        }}
      >
        {initials(row.name)}
      </div>
      <p className="line-clamp-1 max-w-full text-[13px] font-extrabold leading-tight">{row.name}</p>
      <p className="tabular mb-2 font-display text-[21px] font-black leading-none text-[color:var(--accent)]">{row.points}</p>
      <div
        className={`${heights[visualSlot] || "h-[64px]"} flex w-full items-start justify-center rounded-t-[9px] border-[3px] px-2 pt-2 font-display text-[23px] font-black`}
        style={{
          background: isFirst ? "var(--accent)" : "var(--paper)",
          borderColor: "var(--ink)",
          color: isFirst ? "white" : "var(--muted)",
        }}
      >
        {row.rank}
      </div>
    </div>
  );
}

function LeaderboardListRow({ row }: { row: LeaderboardRow }) {
  return (
    <div
      className="flex min-h-[66px] items-center gap-3 py-3"
      style={row.mine ? { background: "color-mix(in srgb, var(--accent) 6%, transparent)" } : undefined}
    >
      <span className="tabular w-8 shrink-0 text-center text-[16px] font-extrabold text-muted">{row.rank}</span>
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[14px] font-display font-black text-muted">
        {initials(row.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[19px] font-black leading-tight">{row.name}</span>
        {row.mine && <span className="block text-[12px] font-semibold text-muted">Du</span>}
      </span>
      <span className="tabular font-display text-[22px] font-black">{row.points}</span>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AwardSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [points, setPoints] = useState("5");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    (api("/api/members") as Promise<{ members: MemberRow[] }>)
      .then((d) => {
        setMembers(d.members);
      })
      .catch(() => setMembers([]));
  }, [open]);

  async function submit() {
    if (userIds.length === 0) return setErr("Mindestens einen Account auswählen.");
    const p = parseInt(points, 10);
    if (!p) return setErr("Punktzahl fehlt.");
    setBusy(true);
    setErr("");
    try {
      await api("/api/points", { method: "POST", body: { user_ids: userIds, points: p, reason } });
      setReason("");
      setPoints("5");
      setUserIds([]);
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
          Noch keine Accounts gefunden. Fuehre zuerst das Account-Seeding aus.
        </p>
      ) : (
        <>
          <Field label="An wen" hint="Du kannst mehrere Accounts auswählen.">
            <AccountMultiSelect accounts={members} selected={userIds} onChange={setUserIds} placeholder="Account suchen" />
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
