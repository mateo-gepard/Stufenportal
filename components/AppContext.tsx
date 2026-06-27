"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getDeviceId } from "@/lib/client";
import { applyColorTheme, isColorThemeKey, type ColorThemeKey } from "@/lib/themes";

export interface AppUser {
  id: string;
  roster_key: string;
  display_name: string;
  sort_name: string;
  role: "student" | "sprecher";
  show_on_leaderboard: boolean;
}

interface AppState {
  admin: boolean;
  speaker: boolean;
  user: AppUser | null;
  ready: boolean;
  theme: "light" | "dark";
  colorTheme: ColorThemeKey;
  login: (rosterKey: string, password: string) => Promise<void>;
  unlock: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  setColorTheme: (theme: ColorThemeKey) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>("standard");

  useEffect(() => {
    getDeviceId(); // sicherstellen, dass die Geräte-ID existiert
    const rawTheme = localStorage.getItem("sp_theme");
    const saved: "light" | "dark" = rawTheme === "dark" ? "dark" : "light";
    const savedColorTheme = localStorage.getItem("sp_color_theme");
    setTheme(saved);
    if (isColorThemeKey(savedColorTheme)) setColorThemeState(savedColorTheme);
    document.documentElement.setAttribute("data-theme", saved);
    applyColorTheme(document.documentElement, isColorThemeKey(savedColorTheme) ? savedColorTheme : "standard", saved);
    (api("/api/auth/me") as Promise<{ user: AppUser | null; speaker: boolean }>)
      .then((d) => {
        setUser(d.user);
        setAdmin(!!d.speaker);
      })
      .catch(() => {})
      .finally(() => setReady(true));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const data = (await api("/api/auth/login", { method: "POST", body: { name, password } })) as {
      user: AppUser;
      speaker: boolean;
    };
    setUser(data.user);
    setAdmin(!!data.speaker);
  }, []);

  const unlock = useCallback(async () => {
    throw new Error("Der Sprecher-Code wurde durch Account-Rollen ersetzt.");
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAdmin(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("sp_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      applyColorTheme(document.documentElement, colorTheme, next);
      return next;
    });
  }, [colorTheme]);

  const setColorTheme = useCallback((next: ColorThemeKey) => {
    localStorage.setItem("sp_color_theme", next);
    setColorThemeState(next);
    applyColorTheme(document.documentElement, next, theme);
  }, [theme]);

  return (
    <Ctx.Provider
      value={{
        admin,
        speaker: admin,
        user,
        ready,
        theme,
        colorTheme,
        login,
        unlock,
        logout,
        toggleTheme,
        setColorTheme,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
