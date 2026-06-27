"use client";

import { useEffect, useState } from "react";

export default function StatusBar() {
  const [time, setTime] = useState("9:41");

  useEffect(() => {
    function update() {
      setTime(new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    }
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sp-status">
      <span>{time}</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden>
          <rect x="0" y="7" width="3" height="5" rx="1" fill="currentColor" />
          <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" fill="currentColor" />
          <rect x="9" y="2" width="3" height="10" rx="1" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" fill="currentColor" opacity=".35" />
        </svg>
        <svg width="22" height="12" viewBox="0 0 22 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="18" height="10" rx="3" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.2" />
          <rect x="2.6" y="2.6" width="13" height="6.8" rx="1.6" fill="currentColor" />
          <rect x="20" y="4" width="1.5" height="4" rx=".75" fill="currentColor" fillOpacity=".5" />
        </svg>
      </div>
    </div>
  );
}
