"use client";

import { useEffect, useState } from "react";
import type { PageData } from "@/lib/design/types";

// Keyed by page object, then by resolution.
const cache = new WeakMap<PageData, Map<number, string>>();
let queue: Promise<unknown> = Promise.resolve();

/** Renders a page preview on demand (serialised through a queue so many cards don't render at once). */
export function DesignPreview({
  page,
  width,
  height,
  className = "",
  alt,
  maxSize = 480,
  fit = "cover",
  zoom = 1,
}: {
  page: PageData;
  width: number;
  height: number;
  className?: string;
  alt: string;
  maxSize?: number;
  fit?: "cover" | "contain";
  zoom?: number;
}) {
  const cached = cache.get(page)?.get(maxSize) ?? null;
  const [rendered, setRendered] = useState<{ page: PageData; size: number; src: string } | null>(null);
  const src = cached ?? (rendered && rendered.page === page && rendered.size === maxSize ? rendered.src : null);
  useEffect(() => {
    if (cache.get(page)?.has(maxSize)) return;
    let cancelled = false;
    queue = queue.then(async () => {
      if (cancelled) return;
      try {
        const { renderThumbnail } = await import("@/components/editor/fabric-setup");
        const url = await renderThumbnail(page, width, height, maxSize);
        if (!cache.has(page)) cache.set(page, new Map());
        cache.get(page)!.set(maxSize, url);
        if (!cancelled) setRendered({ page, size: maxSize, src: url });
      } catch (err) {
        console.warn("Preview failed", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, width, height, maxSize]);
  return (
    <div className={`relative flex min-h-0 items-center justify-center overflow-auto bg-ink-100 ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      {src ? (
        <div className="relative shrink-0" style={{ width: `${Math.max(1, zoom) * 100}%`, aspectRatio: `${width} / ${height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL rendered client-side */}
          <img src={src} alt={alt} className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`} draggable={false} />
        </div>
      ) : (
        <div className="h-full w-full animate-pulse bg-ink-100" aria-hidden="true" />
      )}
    </div>
  );
}
