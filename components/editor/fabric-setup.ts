"use client";

import { FabricObject, FabricImage, Gradient, Group, IText, InteractiveFabricObject, Rect, StaticCanvas, util, type BaseFabricObject, type TFiller } from "fabric";
import { DEFAULT_DYNAMIC_IMAGE_SRC, type PageBackground, type PageData, type SerializedObject } from "@/lib/design/types";
import { loadFonts } from "@/lib/design/fonts";

declare module "fabric" {
  interface FabricObject {
    id?: string;
    name?: string;
    locked?: boolean;
    gimageImageField?: string | null;
    gimageTextOverflow?: "fit" | "clip" | "allow";
    gimageTextMaxHeight?: number;
    gimageTextMinFontSize?: number;
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

export const SERIALIZE_PROPS = ["id", "name", "locked", "gimageImageField", "gimageTextOverflow", "gimageTextMaxHeight", "gimageTextMinFontSize"];
const IMAGE_FIELD_SRC = /^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/;

function normalizeDynamicImages(object: SerializedObject): SerializedObject {
  const next = { ...object };
  if (String(next.type).toLowerCase() === "image" && typeof next.src === "string") {
    const match = next.src.trim().match(IMAGE_FIELD_SRC);
    if (match) {
      next.gimageImageField = typeof next.gimageImageField === "string" && next.gimageImageField ? next.gimageImageField : match[1];
      next.src = DEFAULT_DYNAMIC_IMAGE_SRC;
    }
  }
  if (Array.isArray(next.objects)) next.objects = next.objects.map((child) => normalizeDynamicImages(child as SerializedObject));
  if (next.clipPath && typeof next.clipPath === "object" && !Array.isArray(next.clipPath)) next.clipPath = normalizeDynamicImages(next.clipPath as SerializedObject);
  return next;
}

async function fitDynamicImage(object: SerializedObject): Promise<SerializedObject> {
  const next = { ...object };
  if (String(next.type).toLowerCase() !== "image" || typeof next.gimageImageField !== "string" || typeof next.src !== "string" || typeof next.width !== "number" || typeof next.height !== "number") return next;
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load dynamic image "${next.gimageImageField}".`));
    image.src = next.src as string;
  });
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error(`Dynamic image "${next.gimageImageField}" has no dimensions.`);
  const frameWidth = Math.max(1, Math.round(next.width));
  const frameHeight = Math.max(1, Math.round(next.height));
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the dynamic image frame.");
  // Keep the complete source image visible; do not crop the sides when its
  // aspect ratio differs from the dynamic frame.
  const scale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(image, (frameWidth - drawWidth) / 2, (frameHeight - drawHeight) / 2, drawWidth, drawHeight);
  next.src = canvas.toDataURL("image/png");
  next.width = frameWidth;
  next.height = frameHeight;
  next.clipPath = undefined;
  return next;
}

function fitTextObject(text: IText, source: SerializedObject): void {
  if (source.gimageTextOverflow === "clip" && typeof source.gimageTextMaxHeight === "number") {
    text.set("clipPath", new Rect({ left: 0, top: 0, width: text.width, height: Math.max(1, source.gimageTextMaxHeight), originX: "center", originY: "center", fill: "#ffffff" }));
    text.setCoords();
    return;
  }
  if (source.gimageTextOverflow !== "fit" || typeof source.gimageTextMaxHeight !== "number") return;
  const minFontSize = typeof source.gimageTextMinFontSize === "number" ? Math.max(4, source.gimageTextMinFontSize) : 12;
  const maxHeight = Math.max(1, source.gimageTextMaxHeight);
  while (text.getScaledHeight() > maxHeight && text.fontSize > minFontSize) {
    text.set("fontSize", Math.max(minFontSize, text.fontSize - 1));
    text.initDimensions();
  }
  text.setCoords();
}

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
export async function enlivenSafe(objects: SerializedObject[], strict = false, fitDynamicImages = false): Promise<FabricObject[]> {
  const results = await Promise.allSettled(objects.map(async (object) => {
    const normalized = normalizeDynamicImages(object);
    const prepared = fitDynamicImages ? await fitDynamicImage(normalized) : normalized;
    return { source: prepared, value: await util.enlivenObjects<FabricObject>([prepared]) };
  }));
  const out: FabricObject[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.value.length && (!strict || isCompleteObject(r.value.source, r.value.value[0]))) {
      const source = r.value.source;
      const image = r.value.value[0];
      if (image instanceof FabricImage && typeof source.gimageImageField === "string" && typeof source.width === "number" && typeof source.height === "number") {
        image.set({ width: source.width, height: source.height, scaleX: typeof source.scaleX === "number" ? source.scaleX : 1, scaleY: typeof source.scaleY === "number" ? source.scaleY : 1 });
        image.set("clipPath", new Rect({ left: 0, top: 0, width: source.width, height: source.height, originX: "center", originY: "center", fill: "#ffffff" }));
        image.setCoords();
      }
      if (image instanceof IText) fitTextObject(image, source);
      out.push(...r.value.value);
    }
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
    const objects = await enlivenSafe(page.objects, options.strict, true);
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
