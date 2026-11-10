"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Minimal disclosure popover: closes on outside click and Escape. */
export function Popover({
  trigger,
  children,
  label,
  align = "left",
  className = "",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  const pos = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div role="dialog" aria-label={label} className={`absolute top-full z-40 mt-2 rounded-xl bg-white p-3 shadow-pop ring-1 ring-ink-100 ${pos} ${className}`}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}
