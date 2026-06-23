"use client";

// Anonyme Geräte-ID: einmal erzeugt, in localStorage, geht als Header mit.
// Kein Profil, kein Name — nur Doppel-Vermeidung & Eigentümerschaft.
const KEY = "sp_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: {
      "content-type": "application/json",
      "x-device-id": getDeviceId(),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && (data as { error?: string }).error) || `Fehler ${res.status}`);
  }
  return data as T;
}
