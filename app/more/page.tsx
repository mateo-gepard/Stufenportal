"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import { Card, BottomSheet, Button } from "@/components/ui";
import { Field, Input } from "@/components/form";
import {
  IconBell,
  IconCheck,
  IconEuro,
  IconHome,
  IconLock,
  IconMedal,
  IconMegaphone,
  IconMoon,
  IconPencil,
  IconSliders,
  IconSun,
  IconUser,
} from "@/components/icons";
import type { Me } from "@/lib/types";
import { colorThemes, type ColorThemeKey } from "@/lib/themes";

export default function MorePage() {
  const { admin, theme, colorTheme, setColorTheme, toggleTheme, unlock, logout } = useApp();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [pushState, setPushState] = useState<string>("");
  const [pushEnabled, setPushEnabled] = useState(false);

  // Lokale Identität (kein Konto): Name nur fürs Leaderboard, opt-in.
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [lbErr, setLbErr] = useState("");
  const [lbSaved, setLbSaved] = useState("");
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
      setLbSaved("");
      setNameOpen(true);
      return;
    }
    setLbBusy(true);
    setLbErr("");
    setLbSaved("");
    try {
      await api("/api/me", { method: "POST", body: { name: nm || me?.name || "", show_on_leaderboard: on } });
      if (nm) localStorage.setItem("sp_name", nm);
      const fresh = (await api("/api/me")) as Me;
      setMe(fresh);
      setName(fresh.name || nm);
      setLbSaved(on ? "Du bist jetzt auf dem Leaderboard sichtbar." : "Du bist nicht mehr auf dem Leaderboard sichtbar.");
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
      else {
        setMe((m) => (m ? { ...m, show_on_leaderboard: false } : m));
        setLbErr("");
        setLbSaved("");
      }
      return;
    }
    // Einschalten: Name vorhanden -> sofort speichern, sonst Feld zeigen.
    if (name.trim()) saveLb(true);
    else {
      setNameOpen(true);
      setLbSaved("");
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
      setPushEnabled(true);
      setPushState("Push aktiviert.");
    } catch (e) {
      setPushState("Fehler: " + (e as Error).message);
    }
  }

  function showOnboarding() {
    window.dispatchEvent(new Event("sp:show-onboarding"));
  }

  async function saveName() {
    const nm = name.trim();
    setLbBusy(true);
    setLbErr("");
    setLbSaved("");
    try {
      await api("/api/me", { method: "POST", body: { name: nm, show_on_leaderboard: !!me?.show_on_leaderboard } });
      if (nm) localStorage.setItem("sp_name", nm);
      const fresh = (await api("/api/me")) as Me;
      setMe(fresh);
      setName(fresh.name || nm);
      setNameOpen(false);
      setLbSaved("Name gespeichert.");
    } catch (e) {
      setLbErr((e as Error).message);
    } finally {
      setLbBusy(false);
    }
  }

  return (
    <div className="sp-in pb-6">
      <div className="mb-4">
        <p className="sp-section-kicker">Werkzeuge</p>
        <h1 className="sp-page-title">Mehr</h1>
      </div>

      <div className="mb-4 overflow-hidden rounded-[26px] bg-[color:var(--dark)] p-5 text-white shadow-[6px_6px_0_color-mix(in_srgb,var(--ink)_15%,transparent)]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/12 text-[color:var(--pop)]">
            <IconHome size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[28px] font-black leading-none">{me?.name || name || "Deine Stufe"}</p>
            <p className="mt-1 text-small text-white/62">
              {me ? `${me.points} ${me.points === 1 ? "Punkt" : "Punkte"} · Leaderboard ${show ? "sichtbar" : "aus"}` : "Lokales Profil"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <NavTile href="/kasse" label="Kasse" sub="Stand & Buch" icon={<IconEuro size={21} />} tone="ok" />
        <NavTile href="/leaderboard" label="Leaderboard" sub="Punkte & Ränge" icon={<IconMedal size={21} />} tone="pop" />
        <NavTile href="/abizeitung" label="Abizeitung" sub="Zitate & Fotos" icon={<IconPencil size={21} />} tone="info" />
        <NavTile href="/news" label="News" sub="Alle Meldungen" icon={<IconMegaphone size={21} />} tone="accent" />
        {admin && <NavTile href="/admin" label="Verwaltung" sub="Admin" icon={<IconSliders size={21} />} accent />}
      </div>

      <h2 className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Farbthema</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {(Object.keys(colorThemes) as ColorThemeKey[]).map((key) => (
          <ThemeSwatch
            key={key}
            themeKey={key}
            active={colorTheme === key}
            onPick={() => setColorTheme(key)}
          />
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Einstellungen</h2>
      <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
        <SettingRow
          icon={<IconUser size={19} />}
          title="Dein Name"
          subtitle={me?.name || name || "Noch nicht gesetzt"}
          actionLabel="Ändern"
          onAction={() => setNameOpen(true)}
        />
        <SettingSwitch
          icon={<IconMedal size={19} />}
          title="Im Leaderboard zeigen"
          subtitle="Opt-in, jederzeit umkehrbar"
          checked={show}
          onToggle={() => onToggleLb(!show)}
        />
        <SettingSwitch
          icon={<IconBell size={19} />}
          title="Push-Benachrichtigungen"
          subtitle="Bei wichtigen News & Fristen"
          checked={pushEnabled}
          onToggle={() => {
            if (pushEnabled) {
              setPushEnabled(false);
              setPushState("Push in dieser Ansicht deaktiviert.");
            } else {
              enablePush();
            }
          }}
        />
        <SettingSwitch
          icon={theme === "dark" ? <IconMoon size={19} /> : <IconSun size={19} />}
          title="Dark Mode"
          subtitle="Gespeicherte Einstellung"
          checked={theme === "dark"}
          onToggle={toggleTheme}
          last
        />
      </div>
      {(pushState || lbSaved || lbErr) && (
        <div className="mt-2 space-y-1 px-1 text-[12px]">
          {pushState && (
            <p className="inline-flex items-center gap-1.5 text-muted">
              {pushState === "Push aktiviert." && <IconCheck size={13} />}
              {pushState}
            </p>
          )}
          {lbSaved && <p className="text-success">{lbSaved}</p>}
          {lbErr && <p className="text-danger">{lbErr}</p>}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Einführung</h2>
      <Card className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-[color:var(--signal-text)]">
            <IconHome size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Onboarding ansehen</p>
            <p className="truncate text-[12px] text-muted">Heute, Events, Abstimmungen und Mehr.</p>
          </div>
        </div>
        <Button onClick={showOnboarding} variant="surface">Starten</Button>
      </Card>

      <h2 className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Sprecher-Modus</h2>
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
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[color:var(--surface-2)] text-muted">
              <IconLock size={19} />
            </span>
            <div>
            <p className="font-medium">Sprecher-Modus</p>
            <p className="text-[12px] text-muted">Mit Code freischalten.</p>
            </div>
          </div>
          <Button onClick={() => setUnlockOpen(true)}>Freischalten</Button>
        </Card>
      )}

      <p className="mt-8 px-1 text-[12px] leading-relaxed text-muted">
        Keine Anmeldung, kein Passwort, keine Mail. Deinen Namen gibst du nur dort ein, wo er gebraucht wird —
        beim Eintragen oder Kommentieren. Das Leaderboard ist freiwillig und standardmäßig aus. Anonyme
        Abstimmungen prüfen deinen Namen nur gegen die Stufenliste; deine Auswahl bleibt anonym.
      </p>

      <BottomSheet open={nameOpen} onClose={() => setNameOpen(false)} title="Dein Name">
        <p className="mb-3 text-small text-muted">
          Wird nur dort gezeigt, wo eine Funktion ihn braucht, zum Beispiel bei Eintragungen.
        </p>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setLbErr("");
              setLbSaved("");
            }}
            placeholder="Vor- und Nachname"
            maxLength={40}
          />
        </Field>
        {lbErr && <p className="mb-2 text-small text-danger">{lbErr}</p>}
        <Button onClick={saveName} disabled={lbBusy} full>
          {lbBusy ? "Speichern..." : "Speichern"}
        </Button>
      </BottomSheet>

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

function ThemeSwatch({
  themeKey,
  active,
  onPick,
}: {
  themeKey: ColorThemeKey;
  active: boolean;
  onPick: () => void;
}) {
  const t = colorThemes[themeKey];
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex min-h-[58px] items-center gap-3 rounded-[15px] border-2 px-3 text-left transition active:scale-[0.99]"
      style={{
        borderColor: active ? "var(--ink)" : "var(--line)",
        background: active ? "var(--soft)" : "var(--card)",
      }}
    >
      <span className="flex shrink-0">
        {[t.dark, t.accent, t.pop].map((c, index) => (
          <span
            key={c}
            className="h-[22px] w-[22px] rounded-full border-2 border-surface"
            style={{ background: c, marginLeft: index === 0 ? 0 : -9 }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold" style={{ color: active ? "var(--ink)" : "var(--muted)" }}>
        {t.name}
      </span>
      {active && <IconCheck size={17} style={{ color: "var(--accent)" }} />}
    </button>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line p-3.5">
      <SettingIcon>{icon}</SettingIcon>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold">{title}</p>
        <p className="truncate text-[11.5px] text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-[9px] border border-line bg-[color:var(--soft)] px-3 py-2 text-[12px] font-bold"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function SettingSwitch({
  icon,
  title,
  subtitle,
  checked,
  onToggle,
  last,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3.5 ${last ? "" : "border-b border-line"}`}>
      <SettingIcon>{icon}</SettingIcon>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold">{title}</p>
        <p className="truncate text-[11.5px] text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className="relative h-7 w-12 shrink-0 rounded-full transition"
        style={{ background: checked ? "var(--accent)" : "var(--line)" }}
      >
        <span
          className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.3)] transition-[left]"
          style={{ left: checked ? 23 : 3 }}
        />
      </button>
    </div>
  );
}

function SettingIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[color:var(--soft)] text-muted">
      {children}
    </span>
  );
}

function NavTile({
  href,
  label,
  sub,
  icon,
  accent,
  tone = "info",
}: {
  href: string;
  label: string;
  sub: string;
  icon: ReactNode;
  accent?: boolean;
  tone?: "ok" | "pop" | "info" | "accent";
}) {
  const tones = {
    ok: { bg: "var(--ok-soft)", fg: "var(--ok)", half: "rgba(46,158,107,.25)" },
    pop: { bg: "var(--pop-soft)", fg: "var(--warn)", half: "rgba(227,181,5,.3)" },
    info: { bg: "var(--info-soft)", fg: "var(--info)", half: "rgba(59,111,224,.22)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)", half: "rgba(219,80,74,.25)" },
  }[tone];
  return (
    <Link href={href}>
      <Card className="relative min-h-[118px] overflow-hidden p-3.5">
        <div className="sp-half absolute -right-3 -top-3 h-[60px] w-[60px]" style={{ color: accent ? "rgba(219,80,74,.25)" : tones.half }} />
        <span
          className="relative z-[1] mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[18px]"
          style={{
            background: accent ? "var(--accent)" : tones.bg,
            color: accent ? "white" : tones.fg,
          }}
        >
          {icon}
        </span>
        <p className="relative z-[1] font-extrabold">{label}</p>
        <p className="relative z-[1] text-[12px] text-muted">{sub}</p>
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
