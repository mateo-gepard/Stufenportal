// Anzeige-Helfer. Geld als Cent (Integer) speichern, hier formatieren.
import { APP_LOCALE, APP_TIME_ZONE, appDayDiff } from "@/lib/time";

const eur = new Intl.NumberFormat(APP_LOCALE, { style: "currency", currency: "EUR" });
export function money(cents: number): string {
  return eur.format(Math.round(cents) / 100);
}

export function centsFromEuroInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function euroInputValue(cents?: number | null): string {
  if (!cents) return "";
  return (Math.round(cents) / 100).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const dateFmt = new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIME_ZONE, day: "2-digit", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function date(iso?: string | null): string {
  if (!iso) return "";
  return dateFmt.format(new Date(iso));
}

export function dateTime(iso?: string | null): string {
  if (!iso) return "";
  return dateTimeFmt.format(new Date(iso));
}

/** "Noch 2 Tage", "Heute", "In 3 Std.", "Abgelaufen". */
export function until(iso?: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "Abgelaufen";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `Noch ${mins} Min.`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Noch ${hrs} Std.`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Noch 1 Tag";
  return `Noch ${days} Tage`;
}

export function relativeDay(iso?: string | null): string {
  if (!iso) return "";
  const diff = appDayDiff(iso);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  if (diff === -1) return "Gestern";
  if (diff > 1 && diff < 7) return `In ${diff} Tagen`;
  return date(iso);
}
