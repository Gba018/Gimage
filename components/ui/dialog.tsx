"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Accessible modal built on the native <dialog> element (focus trap and Esc handling included). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-2xl bg-white p-0 text-ink-900 shadow-pop`}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-ink-100" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
