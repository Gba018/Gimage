"use client";

import { ChevronLeft, ChevronRight, Copy, Maximize, Minus, Plus, Trash2 } from "lucide-react";
import { DesignPreview } from "@/components/design-preview";
import { IconButton } from "@/components/ui/button";
import { useEditor } from "./editor-context";

export function PageStrip({ onFit, onManualZoom }: { onFit: () => void; onManualZoom: () => void }) {
  const { engine, state } = useEditor();
  const zoomPct = Math.round(state.zoom * 100);
  const steps = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
  const stepZoom = (dir: 1 | -1) => {
    const z = state.zoom;
    const next = dir > 0 ? steps.find((s) => s > z + 0.001) : [...steps].reverse().find((s) => s < z - 0.001);
    onManualZoom();
    engine.setZoom(next ?? z);
  };
  return (
    <div className="flex h-24 shrink-0 items-center gap-3 border-t border-ink-200 bg-white px-3">
      <ol className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2" aria-label="Pages">
        {state.pages.map((p, i) => {
          const active = i === state.activePage;
          return (
            <li key={p.id} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => engine.gotoPage(i)}
                aria-current={active ? "page" : undefined}
                aria-label={`Page ${i + 1}${p.name ? `: ${p.name}` : ""}`}
                className={`block h-14 overflow-hidden rounded-md ring-2 ${active ? "ring-brand-600" : "ring-transparent hover:ring-ink-300"}`}
              >
                <DesignPreview page={p.data} width={state.width} height={state.height} alt="" className="h-14" />
              </button>
              <span className="absolute -top-1 left-1 rounded bg-white/90 px-1 text-[10px] font-medium text-ink-700 shadow-sm">{i + 1}</span>
              {active && (
                <div className="absolute -right-1 -top-2 hidden gap-0.5 rounded-md bg-white p-0.5 shadow-panel group-focus-within:flex group-hover:flex">
                  <IconButton label="Move page left" className="h-6 min-w-6" disabled={i === 0} onClick={() => engine.movePage(i, i - 1)}>
                    <ChevronLeft size={13} />
                  </IconButton>
                  <IconButton label="Move page right" className="h-6 min-w-6" disabled={i === state.pages.length - 1} onClick={() => engine.movePage(i, i + 1)}>
                    <ChevronRight size={13} />
                  </IconButton>
                  <IconButton label="Duplicate page" className="h-6 min-w-6" onClick={() => engine.duplicatePage(i)}>
                    <Copy size={13} />
                  </IconButton>
                  <IconButton label="Delete page" className="h-6 min-w-6" disabled={state.pages.length <= 1} onClick={() => engine.deletePage(i)}>
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              )}
            </li>
          );
        })}
        <li className="shrink-0">
          <button
            type="button"
            onClick={() => engine.addPage()}
            className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-dashed border-ink-300 text-ink-500 hover:border-brand-500 hover:text-brand-600"
            aria-label="Add page"
            title="Add page"
          >
            <Plus size={18} />
          </button>
        </li>
      </ol>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Zoom out (Ctrl+-)" onClick={() => stepZoom(-1)}>
          <Minus size={15} />
        </IconButton>
        <input
          type="range"
          aria-label="Zoom"
          min={5}
          max={400}
          value={Math.min(400, zoomPct)}
          onChange={(e) => {
            onManualZoom();
            engine.setZoom(Number(e.target.value) / 100);
          }}
          className="hidden w-28 accent-brand-600 md:block"
        />
        <IconButton label="Zoom in (Ctrl+=)" onClick={() => stepZoom(1)}>
          <Plus size={15} />
        </IconButton>
        <span className="w-12 text-center text-xs tabular-nums text-ink-700">{zoomPct}%</span>
        <IconButton label="Fit to screen (Ctrl+0)" onClick={onFit}>
          <Maximize size={15} />
        </IconButton>
      </div>
    </div>
  );
}
