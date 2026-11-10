"use client";

import { FabricObject, FabricText, Group, IText, loadSVGFromString } from "fabric";
import { loadFonts } from "@/lib/design/fonts";
import { findUnsafeObject, MAX_OBJECTS_PER_PAGE, type SerializedObject } from "@/lib/design/types";
import { configureFabric, SERIALIZE_PROPS, uid } from "./fabric-setup";

const TAGS = new Set(["svg", "g", "defs", "title", "desc", "metadata", "rect", "circle", "ellipse", "line", "polygon", "polyline", "path", "text", "tspan", "linearGradient", "radialGradient", "stop", "clipPath"]);
const ATTRIBUTES = new Set(("id xmlns version width height viewBox preserveAspectRatio x y x1 y1 x2 y2 dx dy cx cy r rx ry d points transform fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity visibility display font-family font-size font-weight font-style text-anchor text-decoration letter-spacing clip-path clip-rule gradientUnits gradientTransform offset stop-color stop-opacity spreadMethod fx fy style paint-order vector-effect").split(" "));

/** Validate before Fabric sees the document: no network resources or executable SVG. */
export function sanitizeSvg(source: string): { svg: string; fonts: string[] } {
  if (new TextEncoder().encode(source).length > 2 * 1024 * 1024) throw new Error("SVG must be 2 MB or smaller");
  if (/<!ENTITY/i.test(source)) throw new Error("SVG entities are not supported");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") throw new Error("This file is not a valid SVG");
  const elements = [doc.documentElement, ...doc.documentElement.querySelectorAll("*")];
  if (elements.length > MAX_OBJECTS_PER_PAGE) throw new Error(`SVG supports up to ${MAX_OBJECTS_PER_PAGE} elements`);
  const fonts = new Set<string>();
  for (const el of elements) {
    let depth = 0;
    for (let parent = el.parentElement; parent; parent = parent.parentElement) depth++;
    if (depth > 20) throw new Error("SVG elements are nested too deeply");
    // Metadata isn't artwork; remove it rather than interpreting embedded namespaces.
    if (["metadata", "title", "desc"].includes(el.localName) || el.closest("metadata")) { el.remove(); continue; }
    if (el.namespaceURI !== "http://www.w3.org/2000/svg" || !TAGS.has(el.localName)) throw new Error(`SVG <${el.localName}> is unsupported. Use shapes, paths and text without images, filters or linked resources.`);
    for (const attr of [...el.attributes]) {
      if (attr.name === "xmlns") continue;
      if (attr.name.startsWith("xmlns:")) { el.removeAttributeNode(attr); continue; }
      if (!ATTRIBUTES.has(attr.name)) throw new Error(`SVG attribute "${attr.name}" is unsupported. Export a plain SVG with inline styles.`);
      if (attr.name === "style") {
        for (const declaration of attr.value.split(";")) {
          if (!declaration.trim()) continue;
          const colon = declaration.indexOf(":");
          const property = declaration.slice(0, colon).trim();
          if (colon < 0 || !ATTRIBUTES.has(property) || property === "style") throw new Error("SVG contains an unsupported style");
          el.setAttribute(property, declaration.slice(colon + 1).trim());
        }
        el.removeAttribute("style");
      }
    }
    for (const attr of [...el.attributes]) {
      if (attr.name === "xmlns") continue;
      if (/[\\@]|\/\*/.test(attr.value) || /(?:https?:|data:|javascript:|expression\s*\()/i.test(attr.value)) throw new Error("SVG linked resources are not supported");
      if (/url\s*\(/i.test(attr.value) && !/^url\(\s*['"]?#[\w.-]+['"]?\s*\)$/.test(attr.value)) throw new Error("SVG may only reference local gradients or clip paths");
    }
    if (el.hasAttribute("font-family")) fonts.add(el.getAttribute("font-family")!.replace(/['"]/g, ""));
  }
  // Fabric flattens tspans and loses their placement. Preserve explicit runs as
  // individual editable text layers (including Lumio's own SVG text export).
  for (const text of [...doc.querySelectorAll("text")]) {
    const spans = [...text.children];
    if (!spans.length) continue;
    if (spans.every((span) => span.localName === "tspan" && !span.attributes.length && !span.children.length)) continue;
    if (spans.some((span) => span.localName !== "tspan" || span.children.length || !span.hasAttribute("x") || !span.hasAttribute("y")) || [...text.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim())) throw new Error("SVG text runs need explicit x/y positions. Export plain SVG text with positioned spans.");
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const span of spans) {
      const run = doc.createElementNS("http://www.w3.org/2000/svg", "text");
      for (const attr of [...text.attributes, ...span.attributes]) if (attr.name !== "id") run.setAttribute(attr.name, attr.value);
      run.textContent = span.textContent;
      group.append(run);
    }
    text.replaceWith(group);
  }
  return { svg: new XMLSerializer().serializeToString(doc.documentElement), fonts: [...fonts] };
}

export async function importSvg(file: File, size: { width: number; height: number }, at?: { x: number; y: number }): Promise<SerializedObject[]> {
  if (file.size > 2 * 1024 * 1024) throw new Error("SVG must be 2 MB or smaller");
  configureFabric();
  const { svg, fonts } = sanitizeSvg(await file.text());
  await loadFonts(fonts);
  const parsed = await loadSVGFromString(svg);
  const objects: FabricObject[] = [];
  for (const obj of parsed.objects) {
    if (!obj) throw new Error("Some SVG elements could not be imported");
    // SVG text normally becomes FabricText, which has no editing controls.
    const editable = obj instanceof FabricText ? await IText.fromObject({ ...obj.toObject(), type: "IText" }) : obj;
    editable.set({ id: uid(), name: obj instanceof FabricText ? "SVG text" : `SVG ${obj.type}` });
    objects.push(editable);
  }
  if (!objects.length) throw new Error("SVG has no editable shapes or text");
  const group = new Group(objects);
  const scale = Math.min(1, size.width * 0.9 / group.width, size.height * 0.9 / group.height);
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("SVG dimensions are invalid");
  group.set({ scaleX: scale, scaleY: scale, left: at?.x ?? size.width / 2, top: at?.y ?? size.height / 2 });
  // Removing from the temporary group preserves each object's world transform.
  const result = group.removeAll().map((obj) => obj.toObject(SERIALIZE_PROPS) as SerializedObject);
  const unsafe = findUnsafeObject(result);
  if (unsafe) throw new Error(unsafe);
  return result;
}
