// Konsistentes Linien-Icon-Set (Stroke, currentColor) im Stil der Bottom-Nav.
// Ersetzt alle Emojis/Glyphen in der UI.

type P = { size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties };

function Svg({
  size = 18,
  className,
  strokeWidth = 1.8,
  style,
  fill = "none",
  children,
}: P & { fill?: string; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M5 12.5 10 17.5 20 6.5" />
  </Svg>
);

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Svg>
);

export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </Svg>
);

export const IconVote = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5 9 16.5 19 6.5" />
    <path d="M4 20h16" />
  </Svg>
);

export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Svg>
);

export const IconChevronLeft = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const IconChevronRight = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconPencil = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Svg>
);

export const IconBookmark = (p: P) => (
  <Svg {...p}>
    <path d="M6 4h12v16l-6-4-6 4z" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </Svg>
);

export const IconPlay = (p: P) => (
  <Svg {...p} fill="currentColor" strokeWidth={1}>
    <path d="M8 5.5v13l11-6.5z" />
  </Svg>
);

export const IconStop = (p: P) => (
  <Svg {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
  </Svg>
);

export const IconRadioOn = (p: P) => (
  <Svg {...p} fill="none">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconRadioOff = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
  </Svg>
);

export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M20.5 13.5A8 8 0 1 1 10.5 3.5a6.3 6.3 0 0 0 10 10z" />
  </Svg>
);

export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
  </Svg>
);

export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Svg>
);

export const IconEuro = (p: P) => (
  <Svg {...p}>
    <path d="M17 6.5A6.5 6.5 0 1 0 17 17.5" />
    <path d="M5 10.5h8M5 13.5h8" />
  </Svg>
);

export const IconMegaphone = (p: P) => (
  <Svg {...p}>
    <path d="M4 10v4h3l9 4V6l-9 4z" />
    <path d="M19 9a4 4 0 0 1 0 6" />
  </Svg>
);

export const IconSliders = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
);

export const IconStar = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 17l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5l1.7 5.1 5.1 1.7-5.1 1.7-1.7 5.1-1.7-5.1-5.1-1.7 5.1-1.7z" />
    <path d="M18.5 16.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" />
  </Svg>
);

export const IconMedal = (p: P) => (
  <Svg {...p}>
    <path d="M8.5 2.5l2 4M15.5 2.5l-2 4" />
    <circle cx="12" cy="14.5" r="5.5" />
    <path d="M12 11.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 13.8l2-.3z" />
  </Svg>
);

export const IconArrowDown = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" />
  </Svg>
);

export const IconArrowUp = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" />
  </Svg>
);

export const IconTarget = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconTrophy = (p: P) => (
  <Svg {...p}>
    <path d="M8 4h8v4.5a4 4 0 0 1-8 0z" />
    <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10" />
    <path d="M16 6h2.5A2.5 2.5 0 0 1 16 10" />
    <path d="M12 12.5V17" />
    <path d="M8.5 20h7" />
    <path d="M10 17h4" />
  </Svg>
);

export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M5 19V9" />
    <path d="M12 19V5" />
    <path d="M19 19v-7" />
    <path d="M3.5 19.5h17" />
  </Svg>
);
