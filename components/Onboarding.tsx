"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui";
import { Field, Input } from "@/components/form";
import {
  IconArrowDown,
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconEuro,
  IconHome,
  IconMedal,
  IconMegaphone,
  IconPencil,
  IconSliders,
  IconUser,
  IconVote,
} from "@/components/icons";

const STORAGE_KEY = "sp_onboarding_v1";
const SHOW_EVENT = "sp:show-onboarding";

type MainPreview = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  callouts: string[];
  rows: { title: string; meta: string; tone?: "signal" | "success" | "warning" }[];
};

const mainPreviews: MainPreview[] = [
  {
    id: "today",
    label: "Heute",
    title: "Heute",
    subtitle: "Alles Wichtige zuerst",
    icon: <IconHome size={17} />,
    callouts: ["News", "Fristen", "Offene Votes"],
    rows: [
      { title: "Mottowahl endet bald", meta: "Abstimmung · heute", tone: "warning" },
      { title: "Sommerfest Planung", meta: "3 von 5 Schritten", tone: "signal" },
      { title: "Kursfoto hochladen", meta: "Abizeitung", tone: "success" },
    ],
  },
  {
    id: "events",
    label: "Events",
    title: "Events",
    subtitle: "Planen und eintragen",
    icon: <IconCalendar size={17} />,
    callouts: ["Aufgaben", "Listen", "Fortschritt"],
    rows: [
      { title: "Abigag", meta: "In Planung · 6/10", tone: "signal" },
      { title: "Standdienst", meta: "2 Plätze frei", tone: "success" },
      { title: "Technikcheck", meta: "morgen", tone: "warning" },
    ],
  },
  {
    id: "polls",
    label: "Abstimmungen",
    title: "Abstimmungen",
    subtitle: "Schnell entscheiden",
    icon: <IconVote size={17} />,
    callouts: ["Auswahl", "Anonym möglich", "Ergebnis"],
    rows: [
      { title: "Abi-Pulli Farbe", meta: "42 Stimmen", tone: "signal" },
      { title: "Lied für Einlauf", meta: "anonym", tone: "success" },
      { title: "Termin Klassentreffen", meta: "läuft noch", tone: "warning" },
    ],
  },
];

export default function Onboarding() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [activePreview, setActivePreview] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      setName(localStorage.getItem("sp_name") || "");
      if (localStorage.getItem(STORAGE_KEY) !== "done") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    function showOnboarding() {
      setStep(0);
      setActivePreview(0);
      setErr("");
      setOpen(true);
    }
    window.addEventListener(SHOW_EVENT, showOnboarding);
    return () => window.removeEventListener(SHOW_EVENT, showOnboarding);
  }, []);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [open]);

  async function finish() {
    const trimmed = name.trim();
    setBusy(true);
    setErr("");
    try {
      if (trimmed) {
        localStorage.setItem("sp_name", trimmed);
        await api("/api/me", { method: "POST", body: { name: trimmed, show_on_leaderboard: false } });
      }
      localStorage.setItem(STORAGE_KEY, "done");
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (step < 2) {
      setStep((s) => s + 1);
      setErr("");
      return;
    }
    finish();
  }

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[color:var(--bg)] text-text">
      <div className="mx-auto flex min-h-dvh max-w-screen-sm flex-col px-4 pb-[112px] pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? 26 : 7,
                  background: i === step ? "var(--signal)" : "var(--surface-2)",
                }}
              />
            ))}
          </div>
          <span className="text-[12px] font-medium text-muted">{step + 1} / 3</span>
        </div>

        {step === 0 && <MainScreensStep active={activePreview} setActive={setActivePreview} />}
        {step === 1 && <MoreStep />}
        {step === 2 && <NameStep name={name} setName={setName} err={err} />}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-[61] border-t border-line bg-surface/95 px-4 pb-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-screen-sm items-center gap-3">
          {step > 0 && (
            <Button onClick={() => setStep((s) => s - 1)} variant="surface">
              <IconChevronLeft size={16} />
              <span className="sr-only">Zurück</span>
            </Button>
          )}
          <Button onClick={next} disabled={busy} full>
            {busy ? "Speichern..." : step === 2 ? "Fertig" : "Weiter"}
            {step < 2 && <IconChevronRight size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MainScreensStep({
  active,
  setActive,
}: {
  active: number;
  setActive: (index: number) => void;
}) {
  const startX = useRef<number | null>(null);
  const current = mainPreviews[active];

  function changePreview(dir: -1 | 1) {
    setActive((active + dir + mainPreviews.length) % mainPreviews.length);
  }

  function circularOffset(index: number) {
    let offset = index - active;
    if (offset > 1) offset -= mainPreviews.length;
    if (offset < -1) offset += mainPreviews.length;
    return offset;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (startX.current == null) return;
    const diff = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(diff) < 42) return;
    changePreview(diff < 0 ? 1 : -1);
  }

  return (
    <section className="flex flex-1 flex-col">
      <div className="mb-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Start</p>
        <h1 className="font-display text-display leading-none">Drei Tabs, die du dauernd brauchst.</h1>
        <p className="mt-2 text-small text-muted">Swipe durch die Vorschau und sieh kurz, wo was passiert.</p>
      </div>

      <div
        className="relative mx-auto h-[430px] w-full max-w-[360px] touch-pan-y overflow-hidden"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        {mainPreviews.map((preview, index) => {
          const offset = circularOffset(index);
          const isActive = offset === 0;
          return (
            <button
              key={preview.id}
              type="button"
              onClick={() => setActive(index)}
              className="absolute left-1/2 top-3 w-[258px] origin-center rounded-[24px] border border-line bg-surface p-3 text-left shadow-2xl transition-all duration-300"
              style={{
                transform: `translateX(calc(-50% + ${offset * 126}px)) scale(${isActive ? 1 : 0.86})`,
                opacity: isActive ? 1 : 0.45,
                filter: isActive ? "none" : "blur(2px)",
                zIndex: isActive ? 3 : 1,
              }}
              aria-label={`${preview.label} ansehen`}
              aria-pressed={isActive}
            >
              <MockScreen preview={preview} active={isActive} />
            </button>
          );
        })}
      </div>

      <div className="mt-auto rounded-lg border border-line bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => changePreview(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
            aria-label="Vorherige Vorschau"
          >
            <IconChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="font-medium">{current.label}</p>
            <p className="text-[12px] text-muted">{current.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => changePreview(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
            aria-label="Nächste Vorschau"
          >
            <IconChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {current.callouts.map((label) => (
            <span key={label} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[color:var(--surface-2)] px-2 py-1.5 text-[11px] text-muted">
              <IconArrowDown size={12} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockScreen({ preview, active }: { preview: MainPreview; active: boolean }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-[color:var(--bg)]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div>
          <p className="font-display text-[24px] leading-none">{preview.title}</p>
          <p className="mt-0.5 text-[10px] text-muted">{preview.subtitle}</p>
        </div>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            color: active ? "var(--signal-text)" : "var(--text-muted)",
            background: active ? "color-mix(in srgb, var(--signal) 13%, transparent)" : "var(--surface-2)",
          }}
        >
          {preview.icon}
        </span>
      </div>
      <div className="space-y-2 p-3">
        {preview.callouts.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <span className="h-px flex-1 bg-line" />
            <span className="rounded-full bg-surface px-2 py-1 text-[10px] font-medium text-muted">{label}</span>
            <span className="h-px flex-1 bg-line" style={{ opacity: index === 1 ? 1 : 0.35 }} />
          </div>
        ))}
        {preview.rows.map((row) => (
          <div key={row.title} className="rounded-lg border border-line bg-surface p-2.5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="truncate text-[12px] font-medium">{row.title}</p>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: row.tone === "warning" ? "var(--warning)" : row.tone === "success" ? "var(--success)" : "var(--signal)" }}
              />
            </div>
            <p className="text-[10px] text-muted">{row.meta}</p>
            <div className="mt-2 h-1.5 rounded-full bg-[color:var(--surface-2)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: row.tone === "warning" ? "70%" : row.tone === "success" ? "48%" : "82%",
                  background: row.tone === "warning" ? "var(--warning)" : row.tone === "success" ? "var(--success)" : "var(--signal)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 border-t border-line text-[9px] text-muted">
        {mainPreviews.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-1 px-1 py-2" style={{ color: item.id === preview.id ? "var(--signal-text)" : undefined }}>
            {item.icon}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoreStep() {
  const rows = [
    { label: "Leaderboard", sub: "freiwillig sichtbar", icon: <IconMedal size={18} /> },
    { label: "Abizeitung", sub: "Zitate und Bilder", icon: <IconPencil size={18} /> },
    { label: "Kasse", sub: "Stand und Buchungen", icon: <IconEuro size={18} /> },
    { label: "News", sub: "alle Ankündigungen", icon: <IconMegaphone size={18} /> },
  ];

  return (
    <section className="flex flex-1 flex-col">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Mehr</p>
      <h1 className="font-display text-display leading-none">Alles, was nicht jeden Tag brennt.</h1>
      <p className="mt-2 text-small text-muted">Der Mehr-Tab ist der ruhige Werkzeugkasten für die Stufe.</p>

      <div className="mt-6 rounded-[24px] border border-line bg-surface p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-display text-[28px] leading-none">Mehr</p>
            <p className="mt-1 text-[11px] text-muted">sammeln, prüfen, verwalten</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-[color:var(--signal-text)]">
            <IconSliders size={20} />
          </span>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 rounded-lg border border-line bg-[color:var(--bg)] px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-2)]">{row.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium">{row.label}</p>
                <p className="text-[11px] text-muted">{row.sub}</p>
              </div>
              <IconChevronRight size={15} className="text-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <InfoTile title="Freiwillig" body="Leaderboard ist opt-in." />
        <InfoTile title="Sammeln" body="Abizeitung nimmt Zitate und Bilder." />
        <InfoTile title="Finanzen" body="Kasse bleibt übersichtlich." />
        <InfoTile title="Sprecher" body="Admin-Zeug bleibt im Code-Modus." />
      </div>
    </section>
  );
}

function NameStep({
  name,
  setName,
  err,
}: {
  name: string;
  setName: (value: string) => void;
  err: string;
}) {
  return (
    <section className="flex flex-1 flex-col">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-[color:var(--signal-text)]">
        <IconUser size={30} />
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Name</p>
      <h1 className="font-display text-display leading-none">Ein Name reicht.</h1>
      <p className="mt-2 text-small text-muted">
        Du brauchst keinen Account. Dein Name hilft bei Eintragungen, Kommentaren und später beim freiwilligen Leaderboard.
      </p>

      <div className="mt-6 rounded-lg border border-line bg-surface p-3.5">
        <Field label="Dein Name" hint="Kannst du später in Mehr ändern.">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname oder Spitzname" maxLength={40} />
        </Field>
        <div className="rounded-lg bg-[color:var(--surface-2)] px-3 py-2.5 text-[12px] leading-relaxed text-muted">
          Bei anonymen Abstimmungen wird der Name nur gegen die Stufenliste geprüft. Deine Auswahl bleibt anonym.
        </div>
        {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}
      </div>

      <div className="mt-5 space-y-2 text-small">
        {["Kein Konto", "Name nur dort, wo er gebraucht wird", "Leaderboard bleibt freiwillig"].map((item) => (
          <p key={item} className="flex items-center gap-2 text-muted">
            <IconCheck size={15} style={{ color: "var(--success)" }} />
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

function InfoTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-[12px] leading-snug text-muted">{body}</p>
    </div>
  );
}
