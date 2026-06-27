"use client";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-small font-bold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[15px] text-text outline-none focus:border-[color:var(--signal)] placeholder:text-muted";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-[90px] resize-y ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} appearance-none ${props.className || ""}`}>
      {props.children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex min-h-[48px] w-full items-center justify-between rounded-[14px] border border-line bg-surface px-3.5"
    >
      <span className="text-[15px]">{label}</span>
      {/* Knopf als Flex-Element (kein absolute) -> deterministischer Startpunkt links. */}
      <span
        className="inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
        style={{ background: checked ? "var(--signal)" : "var(--surface-2)" }}
      >
        <span
          className="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}
