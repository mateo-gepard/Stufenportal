"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { colorThemes, type ColorTheme, type ColorThemeKey } from "@/lib/themes";

const STORAGE_KEY = "sp_onboarded_v2";
const SHOW_EVENT = "sp:show-onboarding";

type OnboardingStep = {
  kind?: "info" | "theme";
  kicker: string;
  title: string;
  body: string;
  iconBg?: string;
  iconFg?: string;
  iconPath?: string;
  cta: string;
};

const steps: OnboardingStep[] = [
  {
    kicker: "Schritt 1",
    title: "Alles auf einen Blick",
    body: "Heute bündelt Fristen, kommende Events und offene Abstimmungen. Kein Suchen mehr in zig Chats.",
    iconBg: "var(--pop)",
    iconFg: "var(--ink)",
    iconPath: "M4 17h16M12 4v3M5.5 8.5 7 10M18.5 8.5 17 10M7 17a5 5 0 0 1 10 0",
    cta: "Weiter",
  },
  {
    kicker: "Schritt 2",
    kind: "theme",
    title: "Dein Farbthema",
    body: "Such dir den Look aus, mit dem sich dein Stufenportal am meisten nach eurer Stufe anfühlt.",
    cta: "Weiter",
  },
  {
    kicker: "Schritt 3",
    title: "Events & Eintragen",
    body: "Meilensteine, Eintragungslisten mit Warteliste und Kommentare: die ganze Orga pro Event.",
    iconBg: "var(--info-soft)",
    iconFg: "var(--info)",
    iconPath: "M3.5 5h17v15h-17zM3.5 9.5h17M8 3v3.5M16 3v3.5",
    cta: "Weiter",
  },
  {
    kicker: "Schritt 4",
    title: "Abstimmen - fair",
    body: "Single, Mehrfach oder Ranking. Anonyme Votes gleichen den Namen mit der Stufenliste ab, ohne ihn zu zeigen.",
    iconBg: "var(--accent-soft)",
    iconFg: "var(--accent)",
    iconPath: "M5 21h14M7 21V9m5 12V4m5 17v-8",
    cta: "Weiter",
  },
  {
    kicker: "Fast fertig",
    title: "Kein Account nötig",
    body: "Nur eine zufällige Geräte-ID. Deinen Namen fragen wir nur, wenn eine Funktion ihn braucht. Los geht's.",
    iconBg: "var(--ok-soft)",
    iconFg: "var(--ok)",
    iconPath: "M12 3 4 6.5v5c0 4.5 3.3 7.8 8 9.5 4.7-1.7 8-5 8-9.5v-5L12 3Zm-3 8 2 2 4-4",
    cta: "Los geht's",
  },
];

export default function Onboarding() {
  const { colorTheme, setColorTheme } = useApp();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "done") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    function showOnboarding() {
      setStep(0);
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

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {}
    setOpen(false);
  }

  function next() {
    if (step >= steps.length - 1) {
      finish();
      return;
    }
    setStep((current) => current + 1);
  }

  if (!mounted || !open) return null;

  const current = steps[step] || steps[0];
  const isThemeStep = current.kind === "theme";

  return (
    <div className="absolute inset-0 z-[80] flex flex-col overflow-hidden bg-[color:var(--paper)] text-text">
      <div className="sp-grain" />
      <div className="relative z-[2] flex shrink-0 items-center justify-between px-[22px] pt-[18px]">
        <div className="flex gap-1.5">
          {steps.map((_, index) => (
            <span
              key={index}
              className="h-[7px] rounded transition-all duration-300"
              style={{
                width: index === step ? 24 : 7,
                background: index <= step ? "var(--accent)" : "var(--line)",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finish}
          className="bg-transparent text-[13px] font-bold text-muted"
        >
          Überspringen
        </button>
      </div>

      <div className={`relative z-[2] flex min-h-0 flex-1 flex-col px-7 ${isThemeStep ? "justify-start pt-6" : "justify-center py-6"}`}>
        {isThemeStep ? (
          <ThemeChoiceStep selected={colorTheme} onSelect={setColorTheme} step={current} />
        ) : (
          <>
            <div
              className="flex h-[84px] w-[84px] -rotate-2 items-center justify-center rounded-[24px] border-[2.5px] border-[color:var(--ink)] shadow-[4px_4px_0_var(--ink)]"
              style={{ background: current.iconBg, color: current.iconFg }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d={current.iconPath}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-[34px] text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              {current.kicker}
            </p>
            <h1 className="mt-2 max-w-[310px] font-display text-[34px] font-extrabold leading-[1.02]">
              {current.title}
            </h1>
            <p className="mt-3.5 max-w-[300px] text-[15.5px] leading-[1.55] text-muted">
              {current.body}
            </p>
          </>
        )}
      </div>

      <div
        className="relative z-[2] shrink-0 px-7 pb-7 pt-5"
        style={{ paddingBottom: "calc(28px + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[color:var(--ink)] p-[17px] text-[16px] font-extrabold text-[color:var(--paper)]"
        >
          {current.cta}
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 12h15M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ThemeChoiceStep({
  selected,
  onSelect,
  step,
}: {
  selected: ColorThemeKey;
  onSelect: (theme: ColorThemeKey) => void;
  step: OnboardingStep;
}) {
  const theme = colorThemes[selected] || colorThemes.standard;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--accent)]">
        {step.kicker}
      </p>
      <h1 className="mt-2 font-display text-[31px] font-extrabold leading-[1.02]">
        {step.title}
      </h1>
      <p className="mt-2 max-w-[315px] text-[14.5px] leading-[1.45] text-muted">
        {step.body}
      </p>

      <HomeThemePreview theme={theme} />

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {(Object.entries(colorThemes) as [ColorThemeKey, ColorTheme][]).map(([key, item]) => {
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={active}
              className="flex min-h-[52px] items-center gap-2.5 rounded-[15px] border px-3 text-left transition active:scale-[0.98]"
              style={{
                borderColor: active ? item.ink : item.line,
                background: active ? item.soft : item.card,
                color: item.ink,
                boxShadow: active ? `2px 2px 0 ${item.ink}` : "none",
              }}
            >
              <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full border" style={{ borderColor: item.ink }}>
                <span className="flex-1" style={{ background: item.accent }} />
                <span className="flex-1" style={{ background: item.pop }} />
                <span className="flex-1" style={{ background: item.dark }} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-extrabold">{item.name}</span>
                {active && <span className="block text-[10px] font-bold uppercase tracking-[0.06em]">aktiv</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeThemePreview({ theme }: { theme: ColorTheme }) {
  return (
    <div
      className="mt-4 overflow-hidden rounded-[24px] border p-4 shadow-[0_14px_30px_rgba(17,51,61,0.12)]"
      style={{ background: theme.paper, borderColor: theme.line, color: theme.ink }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
          <span className="h-2 w-2 rotate-45" style={{ background: theme.accent }} />
          Stufenportal - Abi '27
        </div>
        <div
          className="-rotate-2 rounded-[8px] border px-2 py-0.5 font-display text-[10px] font-extrabold"
          style={{ background: theme.pop, borderColor: theme.ink, color: theme.ink, boxShadow: `1.5px 1.5px 0 ${theme.ink}` }}
        >
          Sa, 27. Jun
        </div>
      </div>
      <h2 className="font-display text-[29px] font-extrabold leading-[0.95]">
        <span style={{ background: `linear-gradient(transparent 58%, ${theme.pop} 58%)` }}>Guten Morgen</span>
      </h2>
      <div className="relative mt-4 overflow-hidden rounded-[18px] px-3 py-3" style={{ background: theme.dark, color: theme.paper }}>
        <div className="sp-half absolute -right-3 -top-3 h-[80px] w-[80px] opacity-20" />
        <p className="relative mb-2 text-[8px] font-extrabold uppercase tracking-[0.16em]" style={{ color: `${theme.paper}99` }}>
          Die Lage heute
        </p>
        <div className="relative grid grid-cols-3 gap-2 text-center">
          <PreviewKpi value="3" label="Votes" color={theme.pop} />
          <PreviewKpi value="2" label="Events" color={theme.paper} />
          <PreviewKpi value="1" label="dringend" color={theme.accent} />
        </div>
      </div>
      <div className="sp-theme-pinned mt-3 rounded-[18px] p-3" style={{ background: theme.card, border: `1px solid ${theme.line}` }}>
        <span className="rounded-[7px] px-2 py-1 text-[9px] font-extrabold uppercase" style={{ background: theme.infoSoft, color: theme.info }}>
          Angepinnt
        </span>
        <p className="mt-2 font-display text-[17px] font-extrabold leading-tight">Abimotto-Finale steht!</p>
      </div>
    </div>
  );
}

function PreviewKpi({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div>
      <p className="font-display text-[28px] font-extrabold leading-none" style={{ color }}>{value}</p>
      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.04em] opacity-75">{label}</p>
    </div>
  );
}
