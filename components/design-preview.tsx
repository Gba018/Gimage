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
}: {
  page: PageData;
  width: number;
  height: number;
  className?: string;
  alt: string;
  maxSize?: number;
  fit?: "cover" | "contain";
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
    <div className={`relative overflow-hidden bg-ink-100 ${className}`} style={fit === "cover" ? { aspectRatio: `${width} / ${height}` } : undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL rendered client-side
        <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`} draggable={false} />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-ink-100" aria-hidden="true" />
      )}
    </div>
  );
}
