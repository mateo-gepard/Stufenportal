"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/components/AppContext";
import { api } from "@/lib/client";
import type { EventDetail, PollDetail } from "@/lib/types";

const topBarRoutes: {
  test: (path: string) => boolean;
  kicker: string;
  title: string;
  backTo?: string;
}[] = [
  { test: (p) => /^\/events\/[^/]+/.test(p), kicker: "Events", title: "Event", backTo: "/events" },
  { test: (p) => /^\/polls\/[^/]+/.test(p), kicker: "Abstimmung", title: "Abstimmung", backTo: "/polls" },
  { test: (p) => p === "/kasse", kicker: "Stufenportal", title: "Kasse", backTo: "/more" },
  { test: (p) => p === "/leaderboard", kicker: "Stufenportal", title: "Leaderboard", backTo: "/more" },
  { test: (p) => p === "/abizeitung", kicker: "Stufenportal", title: "Abizeitung", backTo: "/more" },
  { test: (p) => p === "/admin", kicker: "Stufenportal", title: "Verwaltung", backTo: "/more" },
];

export default function ContextTopBar() {
  const path = usePathname();
  const router = useRouter();
  const { admin } = useApp();
  const meta = topBarRoutes.find((route) => route.test(path));
  const [dynamicTitle, setDynamicTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDynamicTitle("");

    const pollMatch = path.match(/^\/polls\/([^/]+)/);
    if (pollMatch) {
      (api(`/api/polls/${pollMatch[1]}`) as Promise<{ poll: PollDetail }>)
        .then((data) => {
          if (!cancelled) setDynamicTitle(data.poll.question);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }

    const eventMatch = path.match(/^\/events\/([^/]+)/);
    if (eventMatch) {
      (api(`/api/events/${eventMatch[1]}`) as Promise<{ event: EventDetail }>)
        .then((data) => {
          if (!cancelled) setDynamicTitle(data.event.title);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!meta) return null;

  return (
    <div className="sp-context-topbar relative z-30 flex shrink-0 items-center gap-3 px-[18px] pb-3.5 pt-[22px]">
      <button
        type="button"
        onClick={() => (meta.backTo ? router.push(meta.backTo) : router.back())}
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] border border-line bg-surface text-text"
        aria-label="Zurück"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--faint)]">
          {meta.kicker}
        </p>
        <p className="sp-top-title truncate">
          {dynamicTitle || meta.title}
        </p>
      </div>
      {admin && (
        <div className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-[9px] bg-[color:var(--ink)] px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[color:var(--paper)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3 4 6.5v5c0 4.5 3.3 7.8 8 9.5 4.7-1.7 8-5 8-9.5v-5L12 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          Sprecher
        </div>
      )}
    </div>
  );
}
