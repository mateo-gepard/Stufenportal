"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getDeviceId } from "@/lib/client";
import { applyColorTheme, isColorThemeKey, type ColorThemeKey } from "@/lib/themes";

interface AppState {
  admin: boolean;
  ready: boolean;
  theme: "light" | "dark";
  colorTheme: ColorThemeKey;
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
    (api("/api/admin/status") as Promise<{ admin: boolean }>)
      .then((d) => setAdmin(d.admin))
      .catch(() => {})
      .finally(() => setReady(true));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const unlock = useCallback(async (code: string) => {
    await api("/api/admin/unlock", { method: "POST", body: { code } });
    setAdmin(true);
  }, []);

  const logout = useCallback(async () => {
    await api("/api/admin/logout", { method: "POST" });
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
    <Ctx.Provider value={{ admin, ready, theme, colorTheme, unlock, logout, toggleTheme, setColorTheme }}>{children}</Ctx.Provider>
  );
}
