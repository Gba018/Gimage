"use client";

import { StaticCanvas } from "fabric";
import { useEffect, useRef, useState } from "react";
import type { PageData } from "@/lib/design/types";
import { backgroundFill, collectFonts, configureFabric, enlivenSafe } from "./fabric-setup";
import { loadFonts } from "@/lib/design/fonts";

export function BulkPreviewCanvas({ page, width, height, zoom = 1 }: { page: PageData; width: number; height: number; zoom?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="relative max-h-[36rem] max-w-full overflow-auto rounded-lg bg-ink-100 p-3 ring-1 ring-ink-200" aria-label="Bulk preview canvas">
      <canvas ref={canvasRef} style={{ width: `${width * Math.max(0.5, zoom)}px`, height: `${height * Math.max(0.5, zoom)}px`, maxWidth: "none", display: "block", margin: "auto" }} />
      {error && <p role="alert" className="absolute inset-x-3 top-3 rounded bg-white/95 p-3 text-xs text-danger-600 shadow">{error}</p>}
    </div>
  );
}
