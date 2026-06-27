export const APP_TIME_ZONE = "Europe/Berlin";
export const APP_LOCALE = "de-DE";

type DateInput = string | number | Date;

const berlinPartsFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function asDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatAppDate(input: DateInput, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIME_ZONE, ...options }).format(asDate(input));
}

export function appDateParts(input: DateInput): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = berlinPartsFormatter.formatToParts(asDate(input));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

export function appDayIndex(input: DateInput): number {
  const parts = appDateParts(input);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 864e5);
}

export function appDayDiff(input: DateInput, base: DateInput = Date.now()): number {
  return appDayIndex(input) - appDayIndex(base);
}

export function appHour(input: DateInput = Date.now()): number {
  return appDateParts(input).hour;
}

export function appMonthShort(input: DateInput): string {
  return formatAppDate(input, { month: "short" }).replace(".", "");
}

function timeZoneOffsetMs(date: Date): number {
  const parts = appDateParts(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function appDateTimeLocalToIso(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const wallTimeAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || "0"));
  let instant = new Date(wallTimeAsUtc);

  // Two passes cover DST offset changes around the target wall time.
  for (let i = 0; i < 2; i += 1) {
    instant = new Date(wallTimeAsUtc - timeZoneOffsetMs(instant));
  }

  return instant.toISOString();
}

export function isPastInstant(iso?: string | null, now: number = Date.now()): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < now;
}

