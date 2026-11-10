"use client";

import { fillTemplate, type CsvData } from "@/lib/design/csv";
import { zipFiles } from "@/lib/design/zip";
import type { DesignDoc } from "@/lib/design/types";
import { renderPage } from "./fabric-setup";

export async function exportCsvTemplates(doc: DesignDoc, data: CsvData, mapping: Record<string, string>, options: { signal: AbortSignal; onProgress: (done: number, total: number) => void; rowIndexes?: number[] }): Promise<Blob> {
  const files: { name: string; data: Uint8Array }[] = [];
  let bytes = 0;
  const rowIndexes = options.rowIndexes ?? data.rows.map((_, index) => index);
  const total = rowIndexes.length * doc.pages.length;
  if (total > 2000) throw new Error("Export up to 2,000 graphics per batch. Use fewer CSV rows or template pages.");
  for (const row of rowIndexes) {
    options.signal.throwIfAborted();
    const filled = fillTemplate(doc, data, row, mapping);
    for (let page = 0; page < filled.pages.length; page++) {
      options.signal.throwIfAborted();
      const url = await renderPage(filled.pages[page], doc.width, doc.height, { multiplier: 1, format: "png", strict: true });
      const encoded = atob(url.slice(url.indexOf(",") + 1));
      const content = Uint8Array.from(encoded, (c) => c.charCodeAt(0));
      bytes += content.length;
      if (bytes > 256 * 1024 * 1024) throw new Error("This batch exceeds 256 MB. Export fewer rows at a time.");
      files.push({ name: `row-${String(row + 1).padStart(3, "0")}-page-${page + 1}.png`, data: content });
      options.onProgress(files.length, total);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  options.signal.throwIfAborted();
  return zipFiles(files);
}
