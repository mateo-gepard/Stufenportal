"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { colorThemes, type ColorTheme, type ColorThemeKey } from "@/lib/themes";

const STORAGE_KEY = "sp_onboarded_v4";
const SHOW_EVENT = "sp:show-onboarding";

type OnboardingStep = {
  kind?: "info" | "theme" | "login";
  kicker: string;
  title: string;
  body: string;
  points?: string[];
  iconBg?: string;
  iconFg?: string;
  iconPath?: string;
  cta: string;
};

const steps: OnboardingStep[] = [
  {
    kicker: "Schritt 1",
    title: "Heute sagt dir, was jetzt zählt",
    body: "Oben siehst du sofort offene Votes, kommende Events und Dringendes. Darunter führen dich Karten direkt zur Aufgabe.",
    points: ["Offene Votes antippen und abstimmen", "Dringend bedeutet News oder nahe Frist", "Events zeigen Datum und Fortschritt"],
    iconBg: "var(--pop)",
    iconFg: "var(--ink)",
    iconPath: "M4 17h16M12 4v3M5.5 8.5 7 10M18.5 8.5 17 10M7 17a5 5 0 0 1 10 0",
    cta: "Weiter",
  },
  {
    kicker: "Schritt 2",
    kind: "theme",
    title: "Dein Farbthema",
    body: "Wähle den Look aus, der sich für eure Stufe richtig anfühlt. Die Vorschau zeigt sofort, wie Heute danach wirkt.",
    cta: "Weiter",
  },
  {
    kicker: "Schritt 3",
    title: "Events ohne Listenchaos",
    body: "In Events findest du Termin, Fortschritt und alles zum Eintragen an einem Ort. Wenn ein Slot voll ist, greift die Warteliste.",
    points: ["Meilensteine zeigen, was noch offen ist", "Slots verhindern doppelte Tabellen", "Kommentare bleiben beim Event"],
    iconBg: "var(--info-soft)",
    iconFg: "var(--info)",
    iconPath: "M3.5 5h17v15h-17zM3.5 9.5h17M8 3v3.5M16 3v3.5",
    cta: "Weiter",
  },
  {
    kicker: "Schritt 4",
    title: "Abstimmen, ohne Chaos",
    body: "Votes können Single, Mehrfach oder Ranking sein. Dein Account sorgt dafür, dass jede Person nur einmal abstimmt.",
    points: ["Anonyme Votes zeigen keine Namen", "Ein Account kann pro Vote nur einmal stimmen", "Ergebnisse bleiben wie gewohnt sichtbar"],
    iconBg: "var(--accent-soft)",
    iconFg: "var(--accent)",
    iconPath: "M5 21h14M7 21V9m5 12V4m5 17v-8",
    cta: "Weiter",
  },
  {
    kicker: "Fast fertig",
    title: "Mehr ist deine Werkzeugkiste",
    body: "Im Mehr-Tab findest du Kasse, Abizeitung, Leaderboard, Farbthema und deinen Account. Sprecherrechte hängen direkt an deiner Rolle.",
    points: ["Leaderboard bleibt freiwillig", "Logout und Rolle stehen im Mehr-Tab", "Onboarding kannst du dort erneut starten"],
    iconBg: "var(--ok-soft)",
    iconFg: "var(--ok)",
    iconPath: "M12 3 4 6.5v5c0 4.5 3.3 7.8 8 9.5 4.7-1.7 8-5 8-9.5v-5L12 3Zm-3 8 2 2 4-4",
    cta: "Los geht's",
  },
];

const loginStep: OnboardingStep = {
  kicker: "Letzter Schritt",
  kind: "login",
  title: "Dein Zugang",
  body: "Gib deinen Namen so ein, wie du ihn sagen würdest, plus dein 6-stelliges Startpasswort.",
  cta: "Einloggen",
};

const authSteps = [...steps, loginStep];

export default function Onboarding({ loginMode = false }: { loginMode?: boolean }) {
  const { colorTheme, setColorTheme, user, login } = useApp();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const currentSteps = loginMode ? authSteps : steps;

  useEffect(() => {
    setMounted(true);
    if (loginMode) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "done") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [loginMode]);

  useEffect(() => {
    if (loginMode) return;
    function showOnboarding() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener(SHOW_EVENT, showOnboarding);
    return () => window.removeEventListener(SHOW_EVENT, showOnboarding);
  }, [loginMode]);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [open]);

  function finish() {
    if (loginMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {}
    setOpen(false);
  }

  async function finishLogin() {
    const name = loginName.trim();
    const code = password.trim();
    if (!name || code.length < 4) {
      setLoginErr("Name oder Passwort fehlt.");
      return;
    }
    setLoginBusy(true);
    setLoginErr("");
    try {
      await login(name, code);
      try {
        localStorage.setItem(STORAGE_KEY, "done");
      } catch {}
      setOpen(false);
    } catch (e) {
      setLoginErr((e as Error).message);
    } finally {
      setLoginBusy(false);
    }
  }

  async function next() {
    const current = currentSteps[step] || currentSteps[0];
    if (current.kind === "login") {
      await finishLogin();
      return;
    }
    if (step >= currentSteps.length - 1) {
      finish();
      return;
    }
    setStep((current) => current + 1);
  }

  function back() {
    setStep((current) => Math.max(0, current - 1));
  }

  if (!mounted || !open || (!user && !loginMode)) return null;

  const current = currentSteps[step] || currentSteps[0];
  const isThemeStep = current.kind === "theme";
  const isLoginStep = current.kind === "login";

  return (
    <div className="absolute inset-0 z-[80] flex flex-col overflow-hidden bg-[color:var(--paper)] text-text">
      <div className="sp-grain" />
      <div className="relative z-[2] flex shrink-0 items-center justify-between px-[22px] pt-[18px]">
        <div className="flex gap-1.5">
          {currentSteps.map((_, index) => (
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
        {!loginMode && (
          <button
            type="button"
            onClick={finish}
            className="bg-transparent text-[13px] font-bold text-muted"
          >
            Überspringen
          </button>
        )}
      </div>

      <div className={`relative z-[2] flex min-h-0 flex-1 flex-col px-7 ${isThemeStep || isLoginStep ? "justify-start pt-6" : "justify-center py-6"}`}>
        {isLoginStep ? (
          <LoginStep
            step={current}
            name={loginName}
            password={password}
            error={loginErr}
            onName={setLoginName}
            onPassword={(value) => setPassword(value.toUpperCase())}
            onSubmit={finishLogin}
          />
        ) : isThemeStep ? (
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
            {current.points && <StepHints points={current.points} />}
          </>
        )}
      </div>

      <div
        className="relative z-[2] shrink-0 px-7 pb-7 pt-5"
        style={{ paddingBottom: "calc(28px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2.5">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="flex min-h-[56px] w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-line bg-surface px-3 text-[14px] font-extrabold text-text"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20 12H5M11 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Zurück
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={loginBusy}
            className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[16px] bg-[color:var(--ink)] px-4 text-[16px] font-extrabold text-[color:var(--paper)]"
          >
            {loginBusy ? "Einloggen..." : current.cta}
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
    </div>
  );
}

function LoginStep({
  step,
  name,
  password,
  error,
  onName,
  onPassword,
  onSubmit,
}: {
  step: OnboardingStep;
  name: string;
  password: string;
  error: string;
  onName: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mb-5 overflow-hidden rounded-[26px] border-[2.5px] border-[color:var(--ink)] bg-[color:var(--dark)] p-5 text-white shadow-[5px_5px_0_var(--ink)]">
        <div className="sp-half absolute -right-6 -top-6 h-[150px] w-[150px] text-white/15" />
        <div className="relative flex h-16 w-16 -rotate-3 items-center justify-center rounded-[20px] bg-[color:var(--pop)] text-[color:var(--ink)] shadow-[3px_3px_0_var(--ink)]">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M12 15v2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="relative mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--pop)]">
          {step.kicker}
        </p>
        <h1 className="relative mt-2 font-display text-[35px] font-extrabold leading-[0.98]">{step.title}</h1>
        <p className="relative mt-3 max-w-[300px] text-[15px] font-semibold leading-[1.45] text-white/70">{step.body}</p>
      </div>

      <div className="space-y-3">
        <label className="block rounded-[19px] border border-line bg-surface p-3.5">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="z. B. Mio Boege"
            autoComplete="off"
            className="w-full bg-transparent font-display text-[23px] font-black outline-none placeholder:text-muted"
          />
        </label>
        <label className="block rounded-[19px] border border-line bg-surface p-3.5">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Startpasswort</span>
          <input
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="6 Zeichen"
            type="password"
            maxLength={6}
            autoComplete="current-password"
            className="w-full bg-transparent font-display text-[23px] font-black uppercase tracking-[0.12em] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {["Name", "Passwort", "Fertig"].map((label, index) => (
          <div key={label} className="rounded-[14px] border border-line bg-surface px-2 py-2 text-center">
            <p className="font-display text-[19px] font-black text-[color:var(--accent)]">0{index + 1}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-muted">{label}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 rounded-[14px] bg-[color:var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-danger">{error}</p>}
    </div>
  );
}

function StepHints({ points }: { points: string[] }) {
  return (
    <div className="mt-5 space-y-2">
      {points.map((point) => (
        <div key={point} className="flex items-start gap-2.5 rounded-[14px] border border-line bg-surface/75 px-3 py-2.5">
          <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-[color:var(--accent)]" />
          <p className="text-[13px] font-bold leading-snug text-text">{point}</p>
        </div>
      ))}
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
