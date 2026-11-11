"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BrandKit } from "@/lib/server/brand-kit";
import { api } from "@/lib/api-client";
import { Button, IconButton } from "@/components/ui/button";
import { ColorPicker } from "./color-picker";
import { useEditor } from "./editor-context";

type ColorTarget = "fill" | "stroke" | "background";
const RECENT_COLORS_KEY = "gimage_recent_colors";

function collectColors(value: unknown, out: Set<string>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectColors(item, out));
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of ["fill", "stroke", "background"]) {
    const color = record[key];
    if (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color)) out.add(color);
  }
  Object.values(record).forEach((item) => {
    if (item && typeof item === "object") collectColors(item, out);
  });
}

export function ColorPanel({ onClose }: { onClose: () => void }) {
  const { engine, state } = useEditor();
  const selected = state.selection;
  const [target, setTarget] = useState<ColorTarget>(selected ? "fill" : "background");
  const [recent, setRecent] = useState<string[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) ?? "[]");
      if (Array.isArray(saved)) setRecent(saved.filter((color): color is string => typeof color === "string").slice(0, 12));
    } catch { /* Storage may be unavailable. */ }
    void api<{ brandKit: BrandKit }>("/api/brand-kit").then(({ brandKit: kit }) => setBrandKit(kit)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selected) setTarget("background");
    else if (target === "background") setTarget("fill");
  }, [selected, target]);

  const documentColors = useMemo(() => {
    const colors = new Set<string>();
    state.pages.forEach((page) => collectColors(page.data, colors));
    return [...colors].slice(0, 24);
  }, [state.pages]);

  const value = target === "background"
    ? (typeof state.pages[state.activePage]?.background === "string" ? state.pages[state.activePage].background as string : null)
    : target === "fill" ? selected?.fill ?? null : selected?.stroke ?? null;

  function applyColor(color: string): void {
    if (target === "background") engine.setBackground(color);
    else if (target === "fill") engine.updateSelection({ fill: color });
    else engine.updateSelection({ stroke: color });
    setRecent((current) => {
      const next = [color, ...current.filter((item) => item.toLowerCase() !== color.toLowerCase())].slice(0, 12);
      try { localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
      return next;
    });
  }

  const canFill = !!selected && !selected.isLine;
  const canStroke = !!selected;

  return (
    <aside className="relative max-h-[42vh] w-full shrink-0 overflow-y-auto border-t border-ink-200 bg-white p-4 md:order-last md:max-h-none md:w-[300px] md:border-l md:border-t-0" aria-label="Color panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900">Color</h2>
          <p className="text-xs text-ink-500">{selected ? "Selected object" : "Page background"}</p>
        </div>
        <IconButton label="Close color panel" onClick={onClose}><X size={16} /></IconButton>
      </div>

      <div className="mb-4 grid grid-cols-3 rounded-lg bg-ink-100 p-1 text-xs">
        {canFill && <button type="button" className={`rounded-md px-2 py-1.5 ${target === "fill" ? "bg-white font-medium shadow-sm" : "text-ink-500"}`} onClick={() => setTarget("fill")}>Fill</button>}
        {canStroke && <button type="button" className={`rounded-md px-2 py-1.5 ${target === "stroke" ? "bg-white font-medium shadow-sm" : "text-ink-500"}`} onClick={() => setTarget("stroke")}>Border</button>}
        <button type="button" className={`rounded-md px-2 py-1.5 ${target === "background" ? "bg-white font-medium shadow-sm" : "text-ink-500"}`} onClick={() => setTarget("background")}>Background</button>
      </div>

      <ColorPicker value={value} onChange={applyColor} allowNone={target !== "background"} />

      {recent.length > 0 && <section className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Recent</h3>
        <div className="flex flex-wrap gap-2">{recent.map((color) => <button key={color} type="button" aria-label={`Apply ${color}`} title={color} onClick={() => applyColor(color)} className="h-8 w-8 rounded-md border border-ink-200" style={{ background: color }} />)}</div>
      </section>}

      {documentColors.length > 0 && <section className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Document colors</h3>
        <div className="flex flex-wrap gap-2">{documentColors.map((color) => <button key={color} type="button" aria-label={`Apply ${color}`} title={color} onClick={() => applyColor(color)} className="h-8 w-8 rounded-md border border-ink-200" style={{ background: color }} />)}</div>
      </section>}

      {brandKit?.colors.length ? <section className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Brand colors</h3>
        <div className="flex flex-wrap gap-2">{brandKit.colors.map((color) => <button key={color} type="button" aria-label={`Apply ${color}`} title={color} onClick={() => applyColor(color)} className="h-8 w-8 rounded-md border border-ink-200" style={{ background: color }} />)}</div>
      </section> : null}

      {selected && <section className="mt-5 border-t border-ink-100 pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Object opacity</h3>
        <label className="flex items-center gap-3 text-sm text-ink-700">
          <input type="range" min={0} max={100} value={Math.round(selected.opacity * 100)} onChange={(event) => engine.updateSelection({ opacity: Number(event.target.value) / 100 })} className="min-w-0 flex-1 accent-brand-600" />
          <span className="w-10 text-right tabular-nums">{Math.round(selected.opacity * 100)}%</span>
        </label>
      </section>}

      <Button type="button" variant="secondary" size="sm" className="mt-5 w-full" onClick={onClose}>Done</Button>
    </aside>
  );
}
