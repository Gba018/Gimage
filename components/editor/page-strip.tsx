"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Copy, Maximize, Minus, Plus, Trash2 } from "lucide-react";
import { DesignPreview } from "@/components/design-preview";
import { Button, IconButton } from "@/components/ui/button";
import { useEditor } from "./editor-context";
import type { BulkPreviewState } from "./bulk-panel";

export function PageStrip({ onFit, onManualZoom, bulkPreview, onHideRibbon, zoomValue, onZoomChange }: { onFit: () => void; onManualZoom: () => void; bulkPreview?: BulkPreviewState; onHideRibbon?: () => void; zoomValue?: number; onZoomChange?: (zoom: number) => void }) {
  const { engine, state } = useEditor();
  const applyZoom = (next: number) => {
    if (onZoomChange) onZoomChange(next);
    else if (bulkPreview) bulkPreview.setZoom(next);
    else engine.setZoom(next);
  };
  if (bulkPreview) {
    const steps = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    const stepBulkZoom = (dir: 1 | -1) => {
      const z = zoomValue ?? bulkPreview.zoom;
      const next = dir > 0 ? steps.find((s) => s > z + 0.001) : [...steps].reverse().find((s) => s < z - 0.001);
      if (next !== undefined) applyZoom(next);
    };
    return (
      <div className="flex h-28 shrink-0 flex-col border-t border-ink-200 bg-white px-3">
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-ink-100">
          <span className="text-[11px] font-medium text-ink-500">Bulk rows</span>
          {onHideRibbon && <Button size="sm" variant="secondary" className="h-7 gap-1 px-2 text-xs" onClick={onHideRibbon} aria-label="Hide preview ribbon">
            <ChevronDown size={14} /> Hide
          </Button>}
        </div>
        <div className="flex min-h-0 flex-1 items-center gap-3">
          <ol className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2" aria-label="Bulk rows">
          {bulkPreview.rowPreviews.map(({ index, page }) => (
            <li key={index} className="group relative shrink-0">
              <button type="button" onClick={() => bulkPreview.setRow(index)} aria-current={index === bulkPreview.row ? "page" : undefined} aria-label={`Row ${index + 1}`} className={`block h-14 overflow-hidden rounded-md ring-2 ${index === bulkPreview.row ? "ring-brand-600" : "ring-transparent hover:ring-ink-300"}`}>
                <DesignPreview page={page} width={bulkPreview.width} height={bulkPreview.height} alt={`Row ${index + 1}`} fit="contain" maxSize={240} className="h-14" />
              </button>
              <span className="absolute -top-1 left-1 rounded bg-white/90 px-1 text-[10px] font-medium text-ink-700 shadow-sm">{index + 1}</span>
            </li>
          ))}
          </ol>
          {bulkPreview.pages.length > 1 && <div className="flex shrink-0 items-center gap-1 border-l border-ink-200 pl-2">
          <IconButton label="Previous bulk page" onClick={() => bulkPreview.setPage(bulkPreview.pageIndex - 1)} disabled={bulkPreview.pageIndex === 0}>
            <ChevronLeft size={15} />
          </IconButton>
          <span className="w-14 text-center text-xs tabular-nums text-ink-700">{bulkPreview.pageIndex + 1} / {bulkPreview.pages.length}</span>
          <IconButton label="Next bulk page" onClick={() => bulkPreview.setPage(bulkPreview.pageIndex + 1)} disabled={bulkPreview.pageIndex >= bulkPreview.pages.length - 1}>
            <ChevronRight size={15} />
          </IconButton>
          </div>}
          <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Zoom out" onClick={() => stepBulkZoom(-1)} disabled={(zoomValue ?? bulkPreview.zoom) <= 1}>
            <Minus size={15} />
          </IconButton>
          <input type="range" aria-label="Bulk preview zoom" min={100} max={300} value={Math.round((zoomValue ?? bulkPreview.zoom) * 100)} onChange={(e) => applyZoom(Number(e.target.value) / 100)} className="hidden w-28 accent-brand-600 md:block" />
          <IconButton label="Zoom in" onClick={() => stepBulkZoom(1)} disabled={(zoomValue ?? bulkPreview.zoom) >= 3}>
            <Plus size={15} />
          </IconButton>
          <span className="w-12 text-center text-xs tabular-nums text-ink-700">{Math.round((zoomValue ?? bulkPreview.zoom) * 100)}%</span>
          <IconButton label="Fit bulk preview to screen" onClick={onFit}>
            <Maximize size={15} />
          </IconButton>
          </div>
        </div>
      </div>
    );
  }

  const currentZoom = zoomValue ?? state.zoom;
  const zoomPct = Math.round(currentZoom * 100);
  const steps = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const stepZoom = (dir: 1 | -1) => {
    const z = currentZoom;
    const next = dir > 0 ? steps.find((s) => s > z + 0.001) : [...steps].reverse().find((s) => s < z - 0.001);
    if (next !== undefined) {
      onManualZoom();
      applyZoom(next);
    }
  };
  return (
    <div className="flex h-28 shrink-0 flex-col border-t border-ink-200 bg-white px-3">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-ink-100">
        <span className="text-[11px] font-medium text-ink-500">Pages</span>
        {onHideRibbon && <Button size="sm" variant="secondary" className="h-7 gap-1 px-2 text-xs" onClick={onHideRibbon} aria-label="Hide editor ribbon">
          <ChevronDown size={14} /> Hide
        </Button>}
      </div>
      <div className="flex min-h-0 flex-1 items-center gap-3">
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
          min={100}
          max={300}
          value={Math.min(300, Math.max(100, zoomPct))}
          onChange={(e) => {
            onManualZoom();
            const next = Number(e.target.value) / 100;
            applyZoom(next);
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
    </div>
  );
}
