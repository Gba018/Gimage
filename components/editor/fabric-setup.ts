"use client";

import { FabricObject, Gradient, Group, InteractiveFabricObject, StaticCanvas, util, type BaseFabricObject, type TFiller } from "fabric";
import type { PageBackground, PageData, SerializedObject } from "@/lib/design/types";
import { loadFonts } from "@/lib/design/fonts";

declare module "fabric" {
  interface FabricObject {
    id?: string;
    name?: string;
    locked?: boolean;
  }
}

let configured = false;

/** One-time global Fabric configuration: custom serialized props and control styling. */
export function configureFabric(): void {
  if (configured) return;
  configured = true;
  FabricObject.customProperties = ["id", "name", "locked"];
  Object.assign(InteractiveFabricObject.ownDefaults, {
    transparentCorners: false,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#7c3aed",
    borderColor: "#7c3aed",
    cornerStyle: "circle",
    cornerSize: 11,
    borderScaleFactor: 1.5,
    padding: 0,
  });
}

export const SERIALIZE_PROPS = ["id", "name", "locked"];

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function backgroundFill(bg: PageBackground, width: number, height: number): string | TFiller {
  if (typeof bg === "string") return bg;
  // Angle convention matches CSS: 0deg points up, 90deg points right.
  const rad = ((bg.angle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const half = (Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))) / 2;
  return new Gradient({
    type: "linear",
    gradientUnits: "pixels",
    coords: { x1: cx - Math.cos(rad) * half, y1: cy - Math.sin(rad) * half, x2: cx + Math.cos(rad) * half, y2: cy + Math.sin(rad) * half },
    colorStops: bg.stops.map((s) => ({ offset: s.offset, color: s.color })),
  });
}

export function backgroundCss(bg: PageBackground): string {
  if (typeof bg === "string") return bg;
  return `linear-gradient(${bg.angle}deg, ${bg.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ")})`;
}

export function collectFonts(objects: SerializedObject[], out = new Set<string>()): Set<string> {
  for (const o of objects) {
    if (typeof o.fontFamily === "string") out.add(o.fontFamily);
    if (o.styles && typeof o.styles === "object") {
      for (const line of Object.values(o.styles)) {
        if (line && typeof line === "object") for (const style of Object.values(line)) {
          if (style && typeof style === "object" && "fontFamily" in style && typeof style.fontFamily === "string") out.add(style.fontFamily);
        }
      }
    }
    if (Array.isArray(o.objects)) collectFonts(o.objects as SerializedObject[], out);
  }
  return out;
}

export function applyLockState(obj: FabricObject): void {
  const locked = !!obj.locked;
  obj.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
    hoverCursor: locked ? "default" : null,
    editable: locked ? false : true,
  } as Partial<FabricObject>);
}

/** Fabric can silently omit failed children; exports must detect partial groups too. */
export function isCompleteObject(source: SerializedObject, instance: BaseFabricObject): boolean {
  if (Array.isArray(source.objects)) {
    if (!(instance instanceof Group)) return false;
    const children = instance.getObjects();
    if (children.length !== source.objects.length || !source.objects.every((child, i) => isCompleteObject(child as SerializedObject, children[i]))) return false;
  }
  if (source.clipPath && (!instance.clipPath || !isCompleteObject(source.clipPath as SerializedObject, instance.clipPath))) return false;
  return true;
}

/** Previews tolerate broken assets; strict exports refuse incomplete artwork. */
export async function enlivenSafe(objects: SerializedObject[], strict = false): Promise<FabricObject[]> {
  const results = await Promise.allSettled(objects.map((o) => util.enlivenObjects<FabricObject>([o])));
  const out: FabricObject[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length && (!strict || isCompleteObject(objects[i], r.value[0]))) out.push(...r.value);
    else if (strict) throw new Error(`Could not load "${objects[i]?.name ?? objects[i]?.type ?? "object"}". Restore the missing asset before exporting.`);
    else console.warn("Skipping object that failed to load", objects[i]?.type);
  });
  return out;
}

/** Renders a page off-screen. Used for thumbnails, page strip previews and exports. */
export async function renderPage(
  page: PageData,
  width: number,
  height: number,
  options: { multiplier: number; format: "png" | "jpeg"; quality?: number; transparent?: boolean; strict?: boolean },
): Promise<string> {
  configureFabric();
  await loadFonts(collectFonts(page.objects));
  const el = document.createElement("canvas");
  const sc = new StaticCanvas(el, { width, height, enableRetinaScaling: false, renderOnAddRemove: false });
  try {
    const objects = await enlivenSafe(page.objects, options.strict);
    sc.add(...objects);
    if (!options.transparent) sc.backgroundColor = backgroundFill(page.background, width, height);
    else if (options.format === "jpeg") sc.backgroundColor = "#ffffff";
    sc.renderAll();
    return sc.toDataURL({ format: options.format, quality: options.quality ?? 0.92, multiplier: options.multiplier, enableRetinaScaling: false });
  } finally {
    sc.dispose();
  }
}

export async function renderPageSvg(page: PageData, width: number, height: number): Promise<string> {
  configureFabric();
  await loadFonts(collectFonts(page.objects));
  const el = document.createElement("canvas");
  const sc = new StaticCanvas(el, { width, height, renderOnAddRemove: false });
  try {
    const objects = await enlivenSafe(page.objects);
    sc.add(...objects);
    sc.backgroundColor = backgroundFill(page.background, width, height);
    return sc.toSVG({ width: `${width}`, height: `${height}`, viewBox: { x: 0, y: 0, width, height } });
  } finally {
    sc.dispose();
  }
}

/** Small JPEG preview, sized for dashboard cards. */
export function renderThumbnail(page: PageData, width: number, height: number, maxSize = 480): Promise<string> {
  const multiplier = Math.min(1, maxSize / Math.max(width, height));
  return renderPage(page, width, height, { multiplier, format: "jpeg", quality: 0.75 });
}
