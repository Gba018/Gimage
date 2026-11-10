import type { SerializedObject } from "./types";

/**
 * Helpers that produce Fabric-serialized objects. Coordinates are given as a
 * top-left box for readability and converted to Fabric 7's center origin.
 */

type Common = {
  name?: string;
  angle?: number;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  shadow?: { color: string; blur: number; offsetX?: number; offsetY?: number };
};

function common(o: Common): SerializedObject {
  const out: SerializedObject = {
    angle: o.angle ?? 0,
    opacity: o.opacity ?? 1,
    stroke: o.stroke ?? null,
    strokeWidth: o.stroke ? (o.strokeWidth ?? 2) : 0,
    strokeUniform: true,
  };
  if (o.name) out.name = o.name;
  if (o.shadow) out.shadow = { offsetX: 0, offsetY: 0, ...o.shadow };
  return out;
}

export function rect(x: number, y: number, w: number, h: number, fill: string, o: Common & { radius?: number } = {}): SerializedObject {
  return {
    type: "Rect",
    left: x + w / 2,
    top: y + h / 2,
    width: w,
    height: h,
    rx: o.radius ?? 0,
    ry: o.radius ?? 0,
    fill,
    name: "Rectangle",
    ...common(o),
  };
}

export function circle(cx: number, cy: number, r: number, fill: string, o: Common = {}): SerializedObject {
  return { type: "Circle", left: cx, top: cy, radius: r, fill, name: "Circle", ...common(o) };
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, o: Common = {}): SerializedObject {
  return { type: "Ellipse", left: cx, top: cy, rx, ry, fill, name: "Ellipse", ...common(o) };
}

export function triangle(x: number, y: number, w: number, h: number, fill: string, o: Common = {}): SerializedObject {
  return { type: "Triangle", left: x + w / 2, top: y + h / 2, width: w, height: h, fill, name: "Triangle", ...common(o) };
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 4, o: Omit<Common, "stroke" | "strokeWidth"> & { dash?: number[] } = {}): SerializedObject {
  return {
    type: "Line",
    x1: -(x2 - x1) / 2,
    y1: -(y2 - y1) / 2,
    x2: (x2 - x1) / 2,
    y2: (y2 - y1) / 2,
    left: (x1 + x2) / 2,
    top: (y1 + y2) / 2,
    ...common({ ...o, stroke, strokeWidth: width }),
    strokeLineCap: "round",
    strokeDashArray: o.dash ?? null,
    name: "Line",
  };
}

export function polygon(cx: number, cy: number, points: { x: number; y: number }[], fill: string, o: Common = {}): SerializedObject {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return {
    type: "Polygon",
    left: cx,
    top: cy,
    points,
    width: w,
    height: h,
    pathOffset: { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 },
    fill,
    name: "Polygon",
    ...common(o),
  };
}

export function regularPolygon(cx: number, cy: number, radius: number, sides: number, fill: string, o: Common = {}): SerializedObject {
  const points = Array.from({ length: sides }, (_, i) => {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
  });
  return { ...polygon(cx, cy, points, fill, o), name: sides === 6 ? "Hexagon" : sides === 5 ? "Pentagon" : "Polygon" };
}

export function star(cx: number, cy: number, outer: number, fill: string, o: Common & { points?: number; inner?: number } = {}): SerializedObject {
  const n = o.points ?? 5;
  const inner = o.inner ?? outer * 0.45;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / n - Math.PI / 2;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  return { ...polygon(cx, cy, pts, fill, o), name: "Star" };
}

/** An SVG path normalised to a w×h box centred at (cx, cy). The path must be drawn in a 100×100 box. */
export function path(cx: number, cy: number, w: number, h: number, d: string, fill: string, o: Common & { name?: string } = {}): SerializedObject {
  return {
    type: "Path",
    left: cx,
    top: cy,
    path: d,
    scaleX: w / 100,
    scaleY: h / 100,
    fill,
    ...common(o),
    name: o.name ?? "Shape",
  };
}

export const SHAPE_PATHS = {
  heart: "M50 92 C20 70 2 52 2 30 C2 14 14 4 28 4 C38 4 46 10 50 18 C54 10 62 4 72 4 C86 4 98 14 98 30 C98 52 80 70 50 92 Z",
  arrow: "M0 38 L62 38 L62 14 L100 50 L62 86 L62 62 L0 62 Z",
  bubble: "M10 4 L90 4 Q98 4 98 12 L98 64 Q98 72 90 72 L40 72 L20 96 L24 72 L10 72 Q2 72 2 64 L2 12 Q2 4 10 4 Z",
  blob: "M52 2 C78 2 98 20 98 46 C98 74 80 98 50 98 C22 98 2 80 2 54 C2 26 26 2 52 2 Z",
  plus: "M36 0 L64 0 L64 36 L100 36 L100 64 L64 64 L64 100 L36 100 L36 64 L0 64 L0 36 L36 36 Z",
  arch: "M0 100 L0 50 C0 22 22 0 50 0 C78 0 100 22 100 50 L100 100 Z",
} as const;

export type TextOptions = Common & {
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number | "normal" | "bold";
  fontStyle?: "normal" | "italic";
  fill?: string;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  charSpacing?: number;
  underline?: boolean;
};

/** Textbox positioned by its top-left corner; height is estimated from explicit line breaks. */
export function text(x: number, y: number, w: number, content: string, o: TextOptions): SerializedObject {
  const lineHeight = o.lineHeight ?? 1.2;
  const lines = content.split("\n").length;
  const height = o.fontSize * 1.13 + (lines - 1) * o.fontSize * lineHeight * 1.13;
  return {
    type: "Textbox",
    left: x + w / 2,
    top: y + height / 2,
    width: w,
    text: content,
    fontSize: o.fontSize,
    fontFamily: o.fontFamily ?? "Inter",
    fontWeight: o.fontWeight ?? "normal",
    fontStyle: o.fontStyle ?? "normal",
    fill: o.fill ?? "#111111",
    textAlign: o.align ?? "left",
    lineHeight,
    charSpacing: o.charSpacing ?? 0,
    underline: o.underline ?? false,
    splitByGrapheme: false,
    ...common(o),
    name: o.name ?? (content.split("\n")[0].slice(0, 40) || "Text"),
  };
}
