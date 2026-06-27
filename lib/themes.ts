export type ColorThemeKey = "standard" | "tinte" | "beere" | "hain";

export type ColorTheme = {
  name: string;
  paper: string;
  card: string;
  soft: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  accent: string;
  accentSoft: string;
  ok: string;
  okSoft: string;
  info: string;
  infoSoft: string;
  warn: string;
  warnSoft: string;
  pop: string;
  popSoft: string;
  dark: string;
  dark2: string;
};

export const colorThemes: Record<ColorThemeKey, ColorTheme> = {
  standard: {
    name: "Stufe",
    paper: "#F4F2EC",
    card: "#FFFFFF",
    soft: "#FBFAF5",
    ink: "#11333D",
    muted: "#6F6A5C",
    faint: "#A8A294",
    line: "#E7E3D8",
    accent: "#DB504A",
    accentSoft: "#F8E2E0",
    ok: "#2E9E6B",
    okSoft: "#E2F2EA",
    info: "#084C61",
    infoSoft: "#DCE9EC",
    warn: "#C77D1A",
    warnSoft: "#F7ECDA",
    pop: "#F2B705",
    popSoft: "#FCEFC6",
    dark: "#084C61",
    dark2: "#0A6072",
  },
  tinte: {
    name: "Tinte",
    paper: "#EEF1F6",
    card: "#FFFFFF",
    soft: "#F5F7FC",
    ink: "#1B2540",
    muted: "#5B6079",
    faint: "#9BA0B6",
    line: "#E0E3EE",
    accent: "#E2574C",
    accentSoft: "#FBE2DF",
    ok: "#2E9E6B",
    okSoft: "#E2F2EA",
    info: "#1E2A4A",
    infoSoft: "#E1E5F1",
    warn: "#D98A2B",
    warnSoft: "#F7ECD8",
    pop: "#2FA6C4",
    popSoft: "#DCF0F5",
    dark: "#1E2A4A",
    dark2: "#2A3C68",
  },
  beere: {
    name: "Beere",
    paper: "#F6F1F4",
    card: "#FFFFFF",
    soft: "#FBF6FA",
    ink: "#2E2233",
    muted: "#6E6473",
    faint: "#ACA2B0",
    line: "#EBE3EA",
    accent: "#2BA88A",
    accentSoft: "#DAF1EA",
    ok: "#2BA88A",
    okSoft: "#DAF1EA",
    info: "#3A2440",
    infoSoft: "#EEE4F0",
    warn: "#C98A2E",
    warnSoft: "#F5ECD9",
    pop: "#EC6FA0",
    popSoft: "#FBE2EE",
    dark: "#3A2440",
    dark2: "#51325C",
  },
  hain: {
    name: "Hain",
    paper: "#F2F2E9",
    card: "#FFFFFF",
    soft: "#F7F7EF",
    ink: "#233528",
    muted: "#656A5E",
    faint: "#A3A797",
    line: "#E2E4D6",
    accent: "#C4502E",
    accentSoft: "#F4E1D7",
    ok: "#4C8A4F",
    okSoft: "#E4EFE2",
    info: "#243D2E",
    infoSoft: "#E2E9E1",
    warn: "#C98A2E",
    warnSoft: "#F5ECD9",
    pop: "#8FB339",
    popSoft: "#EEF2D6",
    dark: "#243D2E",
    dark2: "#34543E",
  },
};

export function isColorThemeKey(value: string | null): value is ColorThemeKey {
  return value === "standard" || value === "tinte" || value === "beere" || value === "hain";
}

export function applyColorTheme(root: HTMLElement, colorTheme: ColorThemeKey, mode: "light" | "dark") {
  const theme = colorThemes[colorTheme] || colorThemes.standard;
  const set = (vars: Record<string, string>) => {
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  };

  if (mode === "dark") {
    set({
      "--paper": "#15140F",
      "--card": "#1F1D17",
      "--soft": "#262219",
      "--ink": "#F2EFE6",
      "--muted": "#A39D8E",
      "--muted-ink": "#A39D8E",
      "--faint": "#6E6859",
      "--line": "#312C23",
      "--line-ink": "#312C23",
      "--accent": theme.accent,
      "--accent-soft": "#3A241A",
      "--ok": theme.ok,
      "--ok-soft": "#1C2D24",
      "--info": theme.dark,
      "--info-soft": "#1B2436",
      "--warn": theme.warn,
      "--warn-soft": "#322716",
      "--pop": theme.pop,
      "--pop-soft": "#3A300F",
      "--dark": theme.dark,
      "--dark2": theme.dark2,
      "--ink2": "#EBE6D8",
    });
  } else {
    set({
      "--paper": theme.paper,
      "--card": theme.card,
      "--soft": theme.soft,
      "--ink": theme.ink,
      "--muted": theme.muted,
      "--muted-ink": theme.muted,
      "--faint": theme.faint,
      "--line": theme.line,
      "--line-ink": theme.line,
      "--accent": theme.accent,
      "--accent-soft": theme.accentSoft,
      "--ok": theme.ok,
      "--ok-soft": theme.okSoft,
      "--info": theme.info,
      "--info-soft": theme.infoSoft,
      "--warn": theme.warn,
      "--warn-soft": theme.warnSoft,
      "--pop": theme.pop,
      "--pop-soft": theme.popSoft,
      "--dark": theme.dark,
      "--dark2": theme.dark2,
      "--ink2": "#2A2113",
    });
  }

  set({
    "--bg": "var(--paper)",
    "--surface": "var(--card)",
    "--surface-2": "var(--soft)",
    "--text": "var(--ink)",
    "--text-muted": "var(--muted)",
    "--border": "var(--line)",
    "--signal": "var(--accent)",
    "--signal-text": "var(--accent)",
    "--success": "var(--ok)",
    "--warning": "var(--warn)",
    "--danger": "var(--accent)",
  });
}
