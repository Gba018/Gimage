"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Minimal disclosure popover: closes on outside click and Escape. */
export function Popover({
  trigger,
  children,
  label,
  align = "left",
  className = "",
  portal = false,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
  portal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node) || contentRef.current?.contains(e.target as Node)) return;
      setOpen(false);
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
  useEffect(() => {
    if (!open || !portal) return;
    const update = () => {
      const bounds = ref.current?.getBoundingClientRect();
      if (bounds) setPosition({ top: bounds.bottom + 8, left: bounds.left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, portal]);
  const pos = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (portal ? (position && createPortal(
        <div ref={contentRef} role="dialog" aria-label={label} className={`fixed z-[100] rounded-xl bg-white p-3 shadow-pop ring-1 ring-ink-100 ${className}`} style={{ top: position.top, left: position.left }}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>,
        document.body,
      )) : (
        <div ref={contentRef} role="dialog" aria-label={label} className={`absolute top-full z-40 mt-2 rounded-xl bg-white p-3 shadow-pop ring-1 ring-ink-100 ${pos} ${className}`}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ))}
    </div>
  );
}
