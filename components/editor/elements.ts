import { circle, ellipse, line, path, rect, regularPolygon, SHAPE_PATHS, star, text, triangle } from "@/lib/design/builders";
import type { SerializedObject } from "@/lib/design/types";

/** An element factory sized relative to the design so it looks right on any canvas. */
export type ElementItem = { id: string; label: string; build: (w: number, h: number) => SerializedObject; preview: string };

const base = (w: number, h: number) => Math.min(w, h) * 0.3;

export const SHAPES: ElementItem[] = [
  { id: "rect", label: "Square", preview: "M10 10H90V90H10Z", build: (w, h) => { const s = base(w, h); return rect(w / 2 - s / 2, h / 2 - s / 2, s, s, "#8b5cf6"); } },
  { id: "rounded", label: "Rounded square", preview: "M25 10H75Q90 10 90 25V75Q90 90 75 90H25Q10 90 10 75V25Q10 10 25 10Z", build: (w, h) => { const s = base(w, h); return rect(w / 2 - s / 2, h / 2 - s / 2, s, s, "#f97316", { radius: s * 0.18 }); } },
  { id: "circle", label: "Circle", preview: "M50 10A40 40 0 1 1 49.9 10Z", build: (w, h) => circle(w / 2, h / 2, base(w, h) / 2, "#06b6d4") },
  { id: "ellipse", label: "Ellipse", preview: "M50 25A40 25 0 1 1 49.9 25Z", build: (w, h) => ellipse(w / 2, h / 2, base(w, h) / 2, base(w, h) / 3, "#22c55e") },
  { id: "triangle", label: "Triangle", preview: "M50 10L90 90H10Z", build: (w, h) => { const s = base(w, h); return triangle(w / 2 - s / 2, h / 2 - s / 2, s, s, "#eab308"); } },
  { id: "star", label: "Star", preview: "M50 8L61 38H93L67 57L77 89L50 70L23 89L33 57L7 38H39Z", build: (w, h) => star(w / 2, h / 2, base(w, h) / 2, "#f43f5e") },
  { id: "hexagon", label: "Hexagon", preview: "M50 8L87 29V71L50 92L13 71V29Z", build: (w, h) => regularPolygon(w / 2, h / 2, base(w, h) / 2, 6, "#3b82f6") },
  { id: "pentagon", label: "Pentagon", preview: "M50 8L90 38L75 88H25L10 38Z", build: (w, h) => regularPolygon(w / 2, h / 2, base(w, h) / 2, 5, "#a855f7") },
  { id: "heart", label: "Heart", preview: SHAPE_PATHS.heart, build: (w, h) => path(w / 2, h / 2, base(w, h), base(w, h) * 0.9, SHAPE_PATHS.heart, "#ec4899", { name: "Heart" }) },
  { id: "arrow", label: "Arrow", preview: SHAPE_PATHS.arrow, build: (w, h) => path(w / 2, h / 2, base(w, h) * 1.3, base(w, h) * 0.6, SHAPE_PATHS.arrow, "#0f172a", { name: "Arrow" }) },
  { id: "bubble", label: "Speech bubble", preview: SHAPE_PATHS.bubble, build: (w, h) => path(w / 2, h / 2, base(w, h) * 1.2, base(w, h), SHAPE_PATHS.bubble, "#14b8a6", { name: "Speech bubble" }) },
  { id: "blob", label: "Blob", preview: SHAPE_PATHS.blob, build: (w, h) => path(w / 2, h / 2, base(w, h), base(w, h), SHAPE_PATHS.blob, "#fb7185", { name: "Blob" }) },
  { id: "plus", label: "Plus", preview: SHAPE_PATHS.plus, build: (w, h) => path(w / 2, h / 2, base(w, h) * 0.8, base(w, h) * 0.8, SHAPE_PATHS.plus, "#10b981", { name: "Plus" }) },
  { id: "arch", label: "Arch", preview: SHAPE_PATHS.arch, build: (w, h) => path(w / 2, h / 2, base(w, h), base(w, h), SHAPE_PATHS.arch, "#d97706", { name: "Arch" }) },
];

export const LINES: ElementItem[] = [
  { id: "line", label: "Line", preview: "M10 50H90", build: (w, h) => line(w / 2 - base(w, h), h / 2, w / 2 + base(w, h), h / 2, "#111111", Math.max(2, base(w, h) / 40)) },
  { id: "dashed", label: "Dashed line", preview: "M10 50H90", build: (w, h) => { const sw = Math.max(2, base(w, h) / 40); return line(w / 2 - base(w, h), h / 2, w / 2 + base(w, h), h / 2, "#111111", sw, { dash: [sw * 3, sw * 2] }); } },
];

export type TextPreset = { id: string; label: string; build: (w: number, h: number) => SerializedObject; className: string };

const scale = (w: number, h: number) => Math.min(w, h);

export const TEXT_PRESETS: TextPreset[] = [
  { id: "heading", label: "Add a heading", className: "text-2xl font-bold", build: (w, h) => { const fs = Math.round(scale(w, h) * 0.09); return text(w * 0.15, h / 2 - fs / 2, w * 0.7, "Add a heading", { fontSize: fs, fontWeight: "bold", align: "center", name: "Heading" }); } },
  { id: "subheading", label: "Add a subheading", className: "text-lg font-semibold", build: (w, h) => { const fs = Math.round(scale(w, h) * 0.055); return text(w * 0.15, h / 2 - fs / 2, w * 0.7, "Add a subheading", { fontSize: fs, fontWeight: "bold", align: "center", fill: "#333333", name: "Subheading" }); } },
  { id: "body", label: "Add a little bit of body text", className: "text-sm", build: (w, h) => { const fs = Math.max(12, Math.round(scale(w, h) * 0.032)); return text(w * 0.2, h / 2 - fs / 2, w * 0.6, "Add a little bit of body text", { fontSize: fs, align: "center", fill: "#333333", lineHeight: 1.4, name: "Body text" }); } },
];

export const FONT_COMBOS: { id: string; label: string; heading: string; body: string; build: (w: number, h: number) => SerializedObject[] }[] = [
  ["editorial", "Playfair Display", "Inter"],
  ["bold", "Bebas Neue", "Montserrat"],
  ["friendly", "Poppins", "Poppins"],
  ["script", "Dancing Script", "Montserrat"],
  ["modern", "Space Grotesk", "Inter"],
  ["slab", "Roboto Slab", "Inter"],
].map(([id, heading, body]) => ({
  id,
  label: `${heading} + ${body}`,
  heading,
  body,
  build: (w: number, h: number) => {
    const fs = Math.round(scale(w, h) * 0.085);
    const bs = Math.round(fs * 0.38);
    const top = h / 2 - fs;
    return [
      text(w * 0.15, top, w * 0.7, "Big idea here", { fontSize: fs, fontFamily: heading, fontWeight: "bold", align: "center", name: "Heading" }),
      text(w * 0.15, top + fs * 1.35, w * 0.7, "A short supporting line of text", { fontSize: bs, fontFamily: body, align: "center", fill: "#444444", name: "Body text" }),
    ];
  },
}));

export const SWATCHES = [
  "#ffffff", "#f8fafc", "#e2e8f0", "#94a3b8", "#475569", "#0f172a", "#000000",
  "#fee2e2", "#fca5a5", "#ef4444", "#b91c1c", "#ffedd5", "#fdba74", "#f97316",
  "#fef9c3", "#fde047", "#eab308", "#dcfce7", "#86efac", "#22c55e", "#15803d",
  "#cffafe", "#67e8f9", "#06b6d4", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8",
  "#ede9fe", "#c4b5fd", "#8b5cf6", "#6d28d9", "#fce7f3", "#f9a8d4", "#ec4899",
];

export const GRADIENTS: { angle: number; stops: string[] }[] = [
  { angle: 135, stops: ["#8b5cf6", "#ff6b57"] },
  { angle: 160, stops: ["#1b1464", "#6a3093", "#e94e77"] },
  { angle: 90, stops: ["#0f766e", "#14b8a6"] },
  { angle: 135, stops: ["#fde68a", "#fbcfe8"] },
  { angle: 180, stops: ["#0ea5e9", "#1e3a8a"] },
  { angle: 45, stops: ["#f97316", "#facc15"] },
  { angle: 135, stops: ["#111827", "#4b5563"] },
  { angle: 180, stops: ["#ecfccb", "#22c55e"] },
];
