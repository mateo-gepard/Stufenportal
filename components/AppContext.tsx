"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getDeviceId } from "@/lib/client";

interface AppState {
  admin: boolean;
  ready: boolean;
  theme: "light" | "dark";
  unlock: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
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
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    getDeviceId(); // sicherstellen, dass die Geräte-ID existiert
    const saved = (localStorage.getItem("sp_theme") as "light" | "dark") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
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
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ admin, ready, theme, unlock, logout, toggleTheme }}>{children}</Ctx.Provider>
  );
}
