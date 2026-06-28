"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppContext";
import { api } from "@/lib/client";
import type { AppBadges } from "@/lib/types";
import type { BadgeSection } from "@/lib/badges";

const tabs = [
  { href: "/", label: "Heute", icon: HomeIcon, badgeKey: null },
  { href: "/events", label: "Events", icon: CalendarIcon, badgeKey: "events" },
  { href: "/polls", label: "Votes", icon: VoteIcon, badgeKey: "votes" },
  { href: "/tasks", label: "Aufgaben", icon: TasksIcon, badgeKey: "tasks" },
  { href: "/more", label: "Mehr", icon: MoreIcon, badgeKey: "more" },
] as const;

const moreRoutes = ["/more", "/news", "/kasse", "/leaderboard", "/abizeitung", "/admin"];

export default function BottomNav() {
  const path = usePathname();
  const { user } = useApp();
  const [badges, setBadges] = useState<AppBadges | null>(null);

  const loadBadges = useCallback(() => {
    if (!user) return;
    api<AppBadges>("/api/badges")
      .then(setBadges)
      .catch(() => setBadges(null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    function load() {
      api<AppBadges>("/api/badges")
        .then((data) => {
          if (!cancelled) setBadges(data);
        })
        .catch(() => {
          if (!cancelled) setBadges(null);
        });
    }
    load();
    const interval = window.setInterval(load, 25000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const section = seenSectionForPath(path);
    if (!section) {
      loadBadges();
      return;
    }

    let cancelled = false;
    api("/api/badges/seen", { method: "POST", body: { section } })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) loadBadges();
      });
    return () => {
      cancelled = true;
    };
  }, [loadBadges, path, user]);

  if (!user) return null;
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 border-t border-line bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around px-2 py-[9px]">
        {tabs.map((t) => {
          const active =
            t.href === "/"
              ? path === "/"
              : t.href === "/more"
                ? moreRoutes.some((route) => path === route || path.startsWith(`${route}/`))
                : path === t.href || path.startsWith(`${t.href}/`);
          const Icon = t.icon;
          const badge = t.badgeKey ? badgeFor(t.badgeKey, badges) : null;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1"
              style={{ color: active ? "var(--signal-text)" : "var(--text-muted)" }}
            >
              <span className="relative">
                <Icon active={active} />
                {badge && <NavBadge badge={badge} />}
              </span>
              <span className="text-[11px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function seenSectionForPath(path: string): BadgeSection | null {
  if (path === "/events" || path.startsWith("/events/")) return "events";
  if (path === "/polls" || path.startsWith("/polls/")) return "votes";
  if (path === "/tasks" || path.startsWith("/tasks/")) return "tasks";
  if (path === "/news" || path.startsWith("/news/")) return "news";
  return null;
}

function badgeFor(key: "events" | "votes" | "tasks" | "more", badges: AppBadges | null): number | "dot" | null {
  if (!badges) return null;
  if (key === "more") return badges.more ? "dot" : null;
  const value = badges[key];
  return value > 0 ? value : null;
}

function NavBadge({ badge }: { badge: number | "dot" }) {
  if (badge === "dot") {
    return (
      <span
        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface"
        style={{ background: "var(--accent)" }}
      />
    );
  }
  return (
    <span
      className="absolute -right-2.5 -top-2 flex min-w-[17px] h-[17px] items-center justify-center rounded-full px-1 text-[10px] font-black leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,.18)]"
      style={{ background: "var(--accent)" }}
    >
      {badge > 9 ? "9+" : badge}
    </span>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17h16M12 4v3M5.5 8.5 7 10M18.5 8.5 17 10M7 17a5 5 0 0 1 10 0" />
    </svg>
  );
}
function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    </svg>
  );
}
function VoteIcon({ active }: { active: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21h14M7 21V9m5 12V4m5 17v-8" />
    </svg>
  );
}
function TasksIcon({ active }: { active: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 11.5 11 14l4.5-5" />
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 17h8" />
    </svg>
  );
}
function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="2.2" />
      <rect x="13" y="4" width="7" height="7" rx="2.2" />
      <rect x="4" y="13" width="7" height="7" rx="2.2" />
      <rect x="13" y="13" width="7" height="7" rx="2.2" />
    </svg>
  );
}
