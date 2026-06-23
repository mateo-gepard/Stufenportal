"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import { Card, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Toggle } from "@/components/form";
import type { Me } from "@/lib/types";

export default function MorePage() {
  const { admin, theme, toggleTheme, unlock, logout } = useApp();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [pushState, setPushState] = useState<string>("");

  // Lokale Identität (kein Konto): Name nur fürs Leaderboard, opt-in.
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [lbErr, setLbErr] = useState("");
  const [lbBusy, setLbBusy] = useState(false);

  useEffect(() => {
    (api("/api/me") as Promise<Me>)
      .then((m) => {
        setMe(m);
        setName(m.name || localStorage.getItem("sp_name") || "");
      })
      .catch(() => setMe({ name: "", show_on_leaderboard: false, points: 0, history: [] }));
  }, []);

  const show = !!me?.show_on_leaderboard;

  async function saveLb(on: boolean) {
    const nm = name.trim();
    if (on && !nm) {
      setLbErr("Gib zuerst einen Namen ein.");
      return;
    }
    setLbBusy(true);
    setLbErr("");
    try {
      await api("/api/me", { method: "POST", body: { name: nm || me?.name || "", show_on_leaderboard: on } });
      if (nm) localStorage.setItem("sp_name", nm);
      const fresh = (await api("/api/me")) as Me;
      setMe(fresh);
    } catch (e) {
      setLbErr((e as Error).message);
    } finally {
      setLbBusy(false);
    }
  }

  function onToggleLb(next: boolean) {
    if (!next) {
      // Ausschalten: nur speichern, wenn überhaupt ein Name existiert.
      if (me?.name || name.trim()) saveLb(false);
      else setMe((m) => (m ? { ...m, show_on_leaderboard: false } : m));
      return;
    }
    // Einschalten: Name vorhanden → sofort speichern, sonst Feld zeigen.
    if (name.trim()) saveLb(true);
    else {
      setMe((m) => (m ? { ...m, show_on_leaderboard: true } : m));
      setLbErr("Gib einen Namen ein und tippe auf Speichern.");
    }
  }

  async function doUnlock() {
    setErr("");
    try {
      await unlock(code);
      setUnlockOpen(false);
      setCode("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function enablePush() {
    setPushState("…");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("Push wird hier nicht unterstützt.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushState("Keine Erlaubnis erteilt.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setPushState("Kein VAPID-Key konfiguriert.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      await api("/api/push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } });
      setPushState("✓ Push aktiviert.");
    } catch (e) {
      setPushState("Fehler: " + (e as Error).message);
    }
  }

  return (
    <div className="sp-in pb-6">
      <h1 className="mb-4 font-display text-display">Mehr</h1>

      <div className="flex flex-col gap-2.5">
        <NavRow href="/leaderboard" label="Leaderboard" sub="Wer macht viel für die Stufe" icon="★" />
        <NavRow href="/kasse" label="Kasse" sub="Kassenstand & Kassenbuch" icon="€" />
        <NavRow href="/news" label="News" sub="Alle Ankündigungen" icon="✦" />
        {admin && <NavRow href="/admin" label="Verwaltung" sub="Übersicht & Papierkorb" icon="⚙︎" accent />}
      </div>

      {/* Leaderboard-Sichtbarkeit (opt-in, default aus) */}
      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Leaderboard</h2>
      <Card>
        <Toggle checked={show} onChange={onToggleLb} label="Auf dem Leaderboard erscheinen" />
        {show && (
          <div className="mt-2.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Angezeigter Name"
              maxLength={40}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] text-muted">So erscheinst du im Leaderboard.</span>
              <Button onClick={() => saveLb(true)} disabled={lbBusy} variant="surface">
                Speichern
              </Button>
            </div>
          </div>
        )}
        <p className="mt-2.5 text-[12px] text-muted">
          {me ? `Du hast ${me.points} ${me.points === 1 ? "Punkt" : "Punkte"}.` : ""}
        </p>
        {lbErr && <p className="mt-1 text-[12px] text-danger">{lbErr}</p>}
      </Card>

      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Benachrichtigungen</h2>
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium">Push aktivieren</p>
          <p className="text-[12px] text-muted">Bei wichtigen News & Fristen.</p>
        </div>
        <Button onClick={enablePush} variant="surface">Aktivieren</Button>
      </Card>
      {pushState && <p className="mt-1.5 px-1 text-[12px] text-muted">{pushState}</p>}

      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Darstellung</h2>
      <Card className="flex items-center justify-between" onClick={toggleTheme}>
        <div>
          <p className="font-medium">{theme === "dark" ? "Dunkel" : "Hell"}</p>
          <p className="text-[12px] text-muted">Tippen zum Wechseln</p>
        </div>
        <span className="text-2xl">{theme === "dark" ? "🌙" : "☀️"}</span>
      </Card>

      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Sprecher-Modus</h2>
      {admin ? (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium" style={{ color: "var(--signal-text)" }}>Sprecher-Modus aktiv</p>
            <p className="text-[12px] text-muted">Du kannst erstellen, bearbeiten & löschen.</p>
          </div>
          <Button onClick={logout} variant="surface">Verlassen</Button>
        </Card>
      ) : (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium">Sprecher-Modus</p>
            <p className="text-[12px] text-muted">Mit Code freischalten.</p>
          </div>
          <Button onClick={() => setUnlockOpen(true)}>Freischalten</Button>
        </Card>
      )}

      <p className="mt-8 px-1 text-[12px] leading-relaxed text-muted">
        Keine Anmeldung, kein Passwort, keine Mail. Deinen Namen gibst du nur dort ein, wo er gebraucht wird —
        beim Eintragen oder Kommentieren. Das Leaderboard ist freiwillig und standardmäßig aus. Anonyme
        Abstimmungen speichern keinerlei Identität.
      </p>

      <BottomSheet open={unlockOpen} onClose={() => setUnlockOpen(false)} title="Sprecher-Modus freischalten">
        <Field label="Code" hint="Den Code bekommst du vom Sprecher-Team.">
          <Input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doUnlock()}
            placeholder="••••••"
          />
        </Field>
        {err && <p className="mb-2 text-small text-danger">{err}</p>}
        <Button onClick={doUnlock} full>Freischalten</Button>
      </BottomSheet>
    </div>
  );
}

function NavRow({ href, label, sub, icon, accent }: { href: string; label: string; sub: string; icon: string; accent?: boolean }) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px]"
          style={{
            background: accent ? "color-mix(in srgb, var(--signal) 14%, transparent)" : "var(--surface-2)",
            color: accent ? "var(--signal-text)" : "var(--text)",
          }}
        >
          {icon}
        </span>
        <div className="flex-1">
          <p className="font-medium">{label}</p>
          <p className="text-[12px] text-muted">{sub}</p>
        </div>
        <span className="text-muted">›</span>
      </Card>
    </Link>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
