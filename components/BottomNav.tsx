"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppContext";

const tabs = [
  { href: "/", label: "Heute", icon: HomeIcon },
  { href: "/events", label: "Events", icon: CalendarIcon },
  { href: "/polls", label: "Votes", icon: VoteIcon },
  { href: "/news", label: "News", icon: NewsIcon },
  { href: "/more", label: "Mehr", icon: MoreIcon },
];

export default function BottomNav() {
  const path = usePathname();
  const { user } = useApp();
  if (!user) return null;
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 border-t border-line bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around px-2 py-[9px]">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1"
              style={{ color: active ? "var(--signal-text)" : "var(--text-muted)" }}
            >
              <Icon active={active} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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
function NewsIcon({ active }: { active: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h3l9 5V4L7 9H4Z" />
      <path d="M19 9.5a4 4 0 0 1 0 5" />
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
