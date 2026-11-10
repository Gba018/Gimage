"use client";

import { FabricImage, FabricObject, FabricText, Group, util } from "fabric";
import { loadFonts } from "@/lib/design/fonts";
import { contrastRatio, solidRgb } from "@/lib/design/contrast";
import type { DesignDoc } from "@/lib/design/types";
import { collectFonts, configureFabric, isCompleteObject } from "./fabric-setup";

export type HealthIssue = { page: number; objectId?: string; label: string; kind: "resolution" | "cutoff" | "contrast" | "font" | "asset"; message: string };

function fontAvailable(family: string): boolean {
  const clean = family.replace(/['"]/g, "");
  if (/^(serif|sans-serif|monospace|system-ui)$/i.test(clean)) return true;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  return ["monospace", "serif"].some((fallback) => {
    ctx.font = `72px ${fallback}`;
    const baseline = ctx.measureText("mmmmWWWWiiii0123456789").width;
    ctx.font = `72px "${clean}", ${fallback}`;
    return Math.abs(ctx.measureText("mmmmWWWWiiii0123456789").width - baseline) > 0.01;
  });
}

/** Uses actual Fabric bounds, including group transforms, independently of editor zoom. */
export async function checkDesignHealth(doc: DesignDoc, pages: number[], scale = 1, transparent = false): Promise<HealthIssue[]> {
  configureFabric();
  const issues: HealthIssue[] = [];
  const fonts = new Set<string>();
  for (const index of pages) if (doc.pages[index]) collectFonts(doc.pages[index].objects, fonts);
  await loadFonts(fonts);
  const available = new Map([...fonts].map((font) => [font, fontAvailable(font)]));
  for (const pageIndex of pages) {
    const page = doc.pages[pageIndex];
    if (!page) continue;
    const loaded = await Promise.allSettled(page.objects.map((obj) => util.enlivenObjects<FabricObject>([obj])));
    const objects: FabricObject[] = [];
    loaded.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value.length) objects.push(...result.value);
      if (result.status !== "fulfilled" || !result.value.length || !isCompleteObject(page.objects[i], result.value[0])) issues.push({ page: pageIndex, label: String(page.objects[i].name ?? "Object"), kind: "asset", message: "This object or one of its assets could not load and may be missing from the export." });
    });
    try {
      const inspect = (obj: FabricObject, backdrop: unknown, inheritedOpacity = 1) => {
        if (!obj.visible || obj.opacity === 0) return;
        const label = obj.name || (obj instanceof FabricText ? obj.text.slice(0, 40) : obj.type);
        const add = (kind: HealthIssue["kind"], message: string) => issues.push({ page: pageIndex, objectId: obj.id, label, kind, message });
        const bounds = obj.getBoundingRect();
        const opacity = inheritedOpacity * obj.opacity;
        if (obj instanceof Group) {
          // A group's backdrop can contain arbitrary overlapping artwork.
          obj.getObjects().forEach((child) => inspect(child, null, opacity));
          return;
        }
        if (obj instanceof FabricImage) {
          const scaling = obj.getObjectScaling();
          if (Math.max(Math.abs(scaling.x), Math.abs(scaling.y)) * scale > 1.05) add("resolution", "Image is enlarged beyond its source pixels. Use a larger image or reduce the export size.");
        }
        if (!(obj instanceof FabricText)) return;
        if (bounds.left < -0.5 || bounds.top < -0.5 || bounds.left + bounds.width > doc.width + 0.5 || bounds.top + bounds.height > doc.height + 0.5 || obj.clipPath || obj.group?.clipPath) add("cutoff", "Text crosses the page edge or has a clipping mask. Check that every character is visible.");
        const families = new Set([obj.fontFamily]);
        for (const line of Object.values(obj.styles ?? {})) for (const style of Object.values(line)) if (style.fontFamily) families.add(style.fontFamily);
        for (const family of families) if (!(available.get(family) ?? fontAvailable(family))) add("font", `Font "${family}" is unavailable on this device. Choose a bundled font to avoid substitution.`);
        const foreground = solidRgb(obj.fill), background = solidRgb(backdrop);
        // Per-character colors and opacity need a rendered pixel analysis; skip them.
        if (foreground && background && opacity === 1 && !Object.keys(obj.styles ?? {}).length) {
          const scaledSize = obj.fontSize * Math.min(Math.abs(obj.getObjectScaling().x), Math.abs(obj.getObjectScaling().y));
          const large = scaledSize >= 24 || (scaledSize >= 18.66 && (obj.fontWeight === "bold" || Number(obj.fontWeight) >= 700));
          const ratio = contrastRatio(foreground, background), minimum = large ? 3 : 4.5;
          if (ratio < minimum) add("contrast", `Text contrast is ${ratio.toFixed(2)}:1; aim for at least ${minimum}:1 against this solid background.`);
        }
      };
      objects.forEach((obj, i) => {
        let backdrop: unknown = transparent ? null : page.background;
        const b = obj.getBoundingRect();
        for (let j = 0; j < i; j++) {
          const under = objects[j];
          if (!under.visible || under.opacity === 0) continue;
          const u = under.getBoundingRect();
          const overlaps = u.left < b.left + b.width && u.left + u.width > b.left && u.top < b.top + b.height && u.top + u.height > b.top;
          if (!overlaps) continue;
          const covers = u.left <= b.left && u.top <= b.top && u.left + u.width >= b.left + b.width && u.top + u.height >= b.top + b.height;
          backdrop = under.type.toLowerCase() === "rect" && !under.angle && !under.clipPath && under.opacity === 1 && !("rx" in under && under.rx) && covers ? under.fill : null;
        }
        inspect(obj, backdrop);
      });
    } finally {
      objects.forEach((obj) => obj.dispose());
    }
  }
  return issues;
}
