"use client";

import { useState } from "react";
import { SWATCHES } from "./elements";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function toHex6(color: string | null): string {
  if (!color) return "#000000";
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) return "#" + color.slice(1).split("").map((c) => c + c).join("");
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) return "#" + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return "#000000";
}

export function ColorPicker({ value, onChange, allowNone = false }: { value: string | null; onChange: (color: string) => void; allowNone?: boolean }) {
  const [hex, setHex] = useState(value ?? "");
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    // Keep the text field in sync when the colour changes elsewhere.
    setPrevValue(value);
    setHex(value ?? "");
  }
  return (
    <div className="w-60 space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {allowNone && (
          <button
            type="button"
            aria-label="No color"
            title="None"
            onClick={() => onChange("transparent")}
            className="relative h-7 w-7 rounded-md bg-white ring-1 ring-ink-200 after:absolute after:left-1/2 after:top-0 after:h-full after:w-0.5 after:-translate-x-1/2 after:rotate-45 after:bg-red-500"
          />
        )}
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            title={c}
            onClick={() => onChange(c)}
            className={`h-7 w-7 rounded-md ring-1 ring-inset ring-black/10 ${value?.toLowerCase() === c ? "outline-2 outline-offset-1 outline-brand-600" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Custom color"
          value={toHex6(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border border-ink-200 bg-white p-0.5"
        />
        <input
          aria-label="Hex color"
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            if (HEX.test(e.target.value)) onChange(e.target.value);
          }}
          className="h-9 min-w-0 flex-1 rounded-lg border border-ink-200 px-2 font-mono text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export function ColorSwatchButton({ color, onClick, label, open }: { color: string | null; onClick: () => void; label: string; open?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={open}
      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-ink-100"
    >
      <span
        className="h-5 w-5 rounded-full ring-1 ring-inset ring-black/15"
        style={{ background: color && color !== "transparent" ? color : "repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0/8px 8px" }}
      />
    </button>
  );
}
