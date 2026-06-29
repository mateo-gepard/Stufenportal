"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import { Card, Button } from "@/components/ui";
import {
  IconBell,
  IconCheck,
  IconEuro,
  IconHome,
  IconMedal,
  IconMegaphone,
  IconMoon,
  IconPencil,
  IconSliders,
  IconSun,
  IconUser,
} from "@/components/icons";
import type { AppBadges, Me } from "@/lib/types";
import { colorThemes, type ColorThemeKey } from "@/lib/themes";

export default function MorePage() {
  const { admin, user, theme, colorTheme, setColorTheme, toggleTheme, logout } = useApp();
  const [pushState, setPushState] = useState<string>("");
  const [pushEnabled, setPushEnabled] = useState(false);

  const [me, setMe] = useState<Me | null>(null);
  const [lbErr, setLbErr] = useState("");
  const [lbSaved, setLbSaved] = useState("");
  const [lbBusy, setLbBusy] = useState(false);
  const [badges, setBadges] = useState<AppBadges | null>(null);

  useEffect(() => {
    Promise.all([
      api<Me>("/api/me"),
      api<AppBadges>("/api/badges"),
    ])
      .then(([m, badgeData]) => {
        setMe(m);
        setBadges(badgeData);
      })
      .catch(() => {
        setMe({ name: user?.display_name || "", show_on_leaderboard: false, leaderboard_active: true, points: 0, history: [] });
        setBadges(null);
      });
  }, [user?.display_name]);

  const show = !!me?.show_on_leaderboard;
  const leaderboardActive = me?.leaderboard_active ?? true;

  async function saveLb(on: boolean) {
    setLbBusy(true);
    setLbErr("");
    setLbSaved("");
    try {
      await api("/api/me", { method: "POST", body: { show_on_leaderboard: on } });
      const fresh = (await api("/api/me")) as Me;
      setMe(fresh);
      setLbSaved(on ? "Du bist jetzt auf dem Leaderboard sichtbar." : "Du bist nicht mehr auf dem Leaderboard sichtbar.");
    } catch (e) {
      setLbErr((e as Error).message);
    } finally {
      setLbBusy(false);
    }
  }

  function onToggleLb(next: boolean) {
    saveLb(next);
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
            <p className="font-display text-[28px] font-black leading-none">{user?.display_name || "Deine Stufe"}</p>
            <p className="mt-1 text-small text-white/62">
              {me
                ? `${me.points} ${me.points === 1 ? "Punkt" : "Punkte"} · Leaderboard ${leaderboardActive ? (show ? "sichtbar" : "aus") : "pausiert"}`
                : "Account aktiv"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <NavTile href="/kasse" label="Kasse" sub="Stand & Buch" icon={<IconEuro size={21} />} tone="ok" />
        <NavTile href="/leaderboard" label="Leaderboard" sub="Punkte & Ränge" icon={<IconMedal size={21} />} tone="pop" />
        <NavTile href="/abizeitung" label="Abizeitung" sub="Zitate & Fotos" icon={<IconPencil size={21} />} tone="info" />
        <NavTile
          href="/news"
          label="News"
          sub={badges?.news ? `${badges.news} neue Hinweise` : "Alle Meldungen"}
          icon={<IconMegaphone size={21} />}
          tone="accent"
          badge={badges?.news ? badges.news : undefined}
        />
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
          title="Account"
          subtitle={admin ? "Sprecher" : "Schüler"}
          actionLabel="Logout"
          onAction={logout}
        />
        <SettingSwitch
          icon={<IconMedal size={19} />}
          title="Im Leaderboard zeigen"
          subtitle={leaderboardActive ? "Standardmäßig an, jederzeit aus" : "Von den Stufensprechern pausiert"}
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

      <h2 className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Rolle</h2>
      {admin ? (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium" style={{ color: "var(--signal-text)" }}>Sprecherrechte aktiv</p>
            <p className="text-[12px] text-muted">Du kannst erstellen, bearbeiten & löschen.</p>
          </div>
          <Link href="/admin">
            <Button variant="surface">Verwaltung</Button>
          </Link>
        </Card>
      ) : (
        <Card className="flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[color:var(--surface-2)] text-muted">
              <IconUser size={19} />
            </span>
            <div>
            <p className="font-medium">Schüler-Account</p>
            <p className="text-[12px] text-muted">Sprecherrechte werden direkt am Account vergeben.</p>
            </div>
          </div>
        </Card>
      )}

      <p className="mt-8 px-1 text-[12px] leading-relaxed text-muted">
        Dein Account ist fest mit der Stufenliste verbunden. Abstimmungen sind dadurch auf eine Stimme pro Person
        begrenzt; bei anonymen Votes bleibt nur die Auswahl anonymisiert gespeichert. Das Leaderboard ist freiwillig
        und standardmäßig sichtbar, kann hier aber ausgeschaltet werden. Stufensprecher können die Rangliste zusätzlich
        für alle pausieren.
      </p>
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
        className="inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200"
        style={{ background: checked ? "var(--accent)" : "var(--surface-2)" }}
      >
        <span
          className="block h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.3)] transition-transform duration-200"
          style={{ transform: checked ? "translateX(23px)" : "translateX(3px)" }}
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
  badge,
  tone = "info",
}: {
  href: string;
  label: string;
  sub: string;
  icon: ReactNode;
  accent?: boolean;
  badge?: number | "dot";
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
          {badge && <TileBadge badge={badge} />}
        </span>
        <p className="relative z-[1] font-extrabold">{label}</p>
        <p className="relative z-[1] text-[12px] text-muted">{sub}</p>
      </Card>
    </Link>
  );
}

function TileBadge({ badge }: { badge: number | "dot" }) {
  if (badge === "dot") {
    return <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />;
  }
  return (
    <span className="absolute -right-2 -top-2 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[10px] font-black leading-none text-white">
      {badge > 9 ? "9+" : badge}
    </span>
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
