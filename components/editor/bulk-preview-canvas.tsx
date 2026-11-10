"use client";

import { StaticCanvas } from "fabric";
import { useEffect, useRef, useState } from "react";
import type { PageData } from "@/lib/design/types";
import { backgroundFill, collectFonts, configureFabric, enlivenSafe } from "./fabric-setup";
import { loadFonts } from "@/lib/design/fonts";

export function BulkPreviewCanvas({ page, width, height, zoom = 1 }: { page: PageData; width: number; height: number; zoom?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateFitScale = () => {
      const availableWidth = Math.max(1, viewport.clientWidth - 24);
      const availableHeight = Math.max(1, viewport.clientHeight - 24);
      const next = Math.min(1, availableWidth / width, availableHeight / height);
      setFitScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    const frame = window.requestAnimationFrame(updateFitScale);
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(viewport);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [page, width, height]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    let cancelled = false;
    configureFabric();
    const canvas = new StaticCanvas(element, { width, height, enableRetinaScaling: false, renderOnAddRemove: false });
    setError("");

    void (async () => {
      try {
        await loadFonts(collectFonts(page.objects));
        const objects = await enlivenSafe(page.objects, false, true);
        if (cancelled) return;
        canvas.add(...objects);
        canvas.backgroundColor = backgroundFill(page.background, width, height);
        canvas.renderAll();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Preview could not be rendered");
      }
    })();

    return () => {
      cancelled = true;
      canvas.dispose();
    };
  }, [page, width, height]);

  // The user-facing zoom is relative to the fitted canvas:
  // 100% = the complete design in the available viewport.
  const safeZoom = Math.max(1, zoom);
  const displayScale = fitScale * safeZoom;
  const canvasWidth = width * displayScale;
  const canvasHeight = height * displayScale;

  return (
    <div ref={viewportRef} className="relative max-h-[36rem] max-w-full overflow-auto rounded-lg bg-ink-100 ring-1 ring-ink-200" aria-label="Bulk preview canvas">
      <div className="flex min-h-full min-w-full items-center justify-center p-3" style={{ width: `${canvasWidth + 24}px`, minHeight: `${canvasHeight + 24}px` }}>
        <canvas ref={canvasRef} style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, maxWidth: "none", display: "block" }} />
      </div>
      {error && <p role="alert" className="absolute inset-x-3 top-3 rounded bg-white/95 p-3 text-xs text-danger-600 shadow">{error}</p>}
    </div>
  );
}
