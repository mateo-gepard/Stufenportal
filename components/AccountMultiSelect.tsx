"use client";

import { useMemo, useState } from "react";
import type { MemberRow } from "@/lib/types";
import { IconCheck, IconSearch, IconUser } from "@/components/icons";

function norm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

export default function AccountMultiSelect({
  accounts,
  selected,
  onChange,
  placeholder = "Namen suchen",
  emptyText = "Keine Accounts gefunden.",
}: {
  accounts: MemberRow[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const selectedAccounts = accounts.filter((account) => selectedSet.has(account.user_id));
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const pool = q ? accounts.filter((account) => norm(account.name).includes(q)) : accounts;
    return pool.slice(0, 12);
  }, [accounts, query]);

  function toggle(id: string) {
    onChange(selectedSet.has(id) ? selected.filter((current) => current !== id) : [...selected, id]);
  }

  return (
    <div className="rounded-[18px] border border-line bg-surface p-3">
      <div className="mb-3 flex items-center gap-2 rounded-[14px] bg-[color:var(--soft)] px-3 py-2.5">
        <IconSearch size={16} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[14px] font-bold outline-none placeholder:text-muted"
        />
      </div>

      {selectedAccounts.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selectedAccounts.map((account) => (
            <button
              key={account.user_id}
              type="button"
              onClick={() => toggle(account.user_id)}
              className="rounded-[10px] bg-[color:var(--accent-soft)] px-2.5 py-1 text-[12px] font-extrabold text-[color:var(--accent)]"
            >
              {account.name} ×
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[245px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="rounded-[13px] bg-[color:var(--soft)] px-3 py-2 text-[12px] text-muted">{emptyText}</p>
        ) : (
          filtered.map((account) => {
            const active = selectedSet.has(account.user_id);
            return (
              <button
                key={account.user_id}
                type="button"
                onClick={() => toggle(account.user_id)}
                className="flex min-h-[48px] w-full items-center gap-2.5 rounded-[14px] border px-3 text-left transition active:scale-[0.99]"
                style={{
                  borderColor: active ? "var(--ink)" : "var(--line)",
                  background: active ? "var(--soft)" : "var(--surface)",
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px]"
                  style={{ background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "white" : "var(--muted)" }}
                >
                  {active ? <IconCheck size={16} strokeWidth={2.7} /> : <IconUser size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-extrabold">{account.name}</span>
                  <span className="block text-[11px] text-muted">{account.points} Pkt</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
