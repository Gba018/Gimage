"use client";

import { useEffect, useRef, useState } from "react";
import type { PageData } from "@/lib/design/types";
import { renderPage } from "./fabric-setup";

export function BulkPreviewCanvas({ page, width, height, zoom = 1 }: { page: PageData; width: number; height: number; zoom?: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [src, setSrc] = useState<string | null>(null);
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
    let cancelled = false;
    setSrc(null);
    setError("");
    void renderPage(page, width, height, { multiplier: 1, format: "png" }).then((url) => {
      if (!cancelled) setSrc(url);
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Preview could not be rendered");
    });
    return () => { cancelled = true; };
  }, [page, width, height]);

  const displayScale = fitScale * Math.max(1, zoom);
  const canvasWidth = width * displayScale;
  const canvasHeight = height * displayScale;

  return (
    <div ref={viewportRef} className="relative max-h-[36rem] max-w-full overflow-auto rounded-lg bg-ink-100 ring-1 ring-ink-200" aria-label="Bulk preview canvas">
      <div className="flex min-h-full min-w-full items-center justify-center p-3" style={{ width: `${canvasWidth + 24}px`, minHeight: `${canvasHeight + 24}px` }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered data URL from the shared Fabric renderer
          <img src={src} alt="Bulk preview" draggable={false} style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, maxWidth: "none", display: "block" }} />
        ) : !error ? (
          <div className="flex items-center justify-center text-xs text-ink-500" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>Rendering preview…</div>
        ) : null}
      </div>
      {error && <p role="alert" className="absolute inset-x-3 top-3 rounded bg-white/95 p-3 text-xs text-danger-600 shadow">{error}</p>}
    </div>
  );
}
