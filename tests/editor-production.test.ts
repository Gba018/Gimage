// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeSvg, importSvg } from "@/components/editor/svg-import";
import { checkDesignHealth } from "@/components/editor/health-check";
import { enlivenSafe } from "@/components/editor/fabric-setup";
import { blankDoc, parseDesignDoc } from "@/lib/design/types";
import { rect, text } from "@/lib/design/builders";

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">${body}</svg>`;

// These unit tests exercise parsing and geometry. Real raster output is checked in a browser.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    font: "", measureText: (value: string) => ({ width: value.length * 10 }),
  }) as unknown as CanvasRenderingContext2D);
});

describe("editable SVG import", () => {
  it("keeps plain artwork and local gradients, converting inline style attributes", () => {
    const result = sanitizeSvg(svg('<defs><linearGradient id="a"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="20" height="20" style="fill:url(#a);opacity:0.5"/>'));
    expect(result.svg).toContain('fill="url(#a)"');
    expect(result.svg).not.toContain("style=");
  });
  it.each(['<script>alert(1)</script>', '<image href="https://example.com/x.png"/>', '<foreignObject/>', '<rect onclick="alert(1)"/>', '<style>@import "x";</style>', '<rect fill="url(https://example.com/x)"/>', '<rect style="fill:u\\72l(https://example.com/x)"/>', '<use href="#x"/>', '<animate/>'])('rejects executable, external or unsupported content: %s', (body) => expect(() => sanitizeSvg(svg(body))).toThrow());
  it("rejects malformed XML and non-SVG roots", () => {
    expect(() => sanitizeSvg("<svg><rect>")).toThrow();
    expect(() => sanitizeSvg("<html/>")).toThrow();
  });
  it("preserves positioned SVG text spans as individual editable runs", () => {
    const result = sanitizeSvg(svg('<text font-family="serif"><tspan x="10" y="20" fill="#f00">One</tspan><tspan x="10" y="40">Two</tspan></text>'));
    const parsed = new DOMParser().parseFromString(result.svg, "image/svg+xml");
    expect(parsed.querySelectorAll("text")).toHaveLength(2);
    expect(parsed.querySelector("text")?.getAttribute("fill")).toBe("#f00");
    expect(() => sanitizeSvg(svg('<text><tspan fill="#f00">No position</tspan></text>'))).toThrow("explicit x/y");
  });
  it("imports shapes and text as independently editable, persistable layers", async () => {
    const source = svg('<rect x="0" y="0" width="20" height="30" fill="#f00"/><text x="30" y="40" font-family="serif" font-size="12">Hello</text>');
    const file = { size: source.length, text: async () => source } as File;
    const objects = await importSvg(file, { width: 200, height: 200 });
    expect(objects).toHaveLength(2);
    expect(objects.map((o) => o.type)).toEqual(["Rect", "IText"]);
    expect(objects[1].text).toBe("Hello");
    const doc = blankDoc(200, 200); doc.pages[0].objects = objects;
    expect(parseDesignDoc(doc).ok).toBe(true);
    expect(new Set(objects.map((o) => o.id)).size).toBe(2);
  });
});

describe("design health check", () => {
  it("warns about missing nested assets and refuses a partial bulk export", async () => {
    const doc = blankDoc(100, 100);
    doc.pages[0].objects = [{ type: "Group", objects: [{ type: "Rect", width: 20, height: 20 }, { type: "Text", text: null }] }];
    expect((await checkDesignHealth(doc, [0])).some((i) => i.kind === "asset")).toBe(true);
    await expect(enlivenSafe(doc.pages[0].objects, true)).rejects.toThrow("Restore the missing asset");
  });
  it("finds off-page text, low contrast and unavailable fonts on selected pages", async () => {
    const doc = blankDoc(100, 100);
    doc.pages[0].objects = [text(90, 90, 100, "Cut off", { fontSize: 20, fill: "#eee", fontFamily: "NoSuchLumioFont" })];
    const issues = await checkDesignHealth(doc, [0]);
    expect(issues.map((i) => i.kind)).toEqual(expect.arrayContaining(["cutoff", "contrast", "font"]));
    expect(await checkDesignHealth(doc, [])).toEqual([]);
  });
  it("assesses the solid shape behind text instead of the page background", async () => {
    const doc = blankDoc(300, 300);
    doc.pages[0].objects = [rect(0, 0, 300, 300, "#000"), text(20, 20, 240, "Readable", { fontSize: 24, fill: "#fff", fontFamily: "serif" })];
    expect((await checkDesignHealth(doc, [0])).filter((i) => i.kind === "contrast")).toEqual([]);
    doc.pages[0].objects[0].fill = "#fff";
    expect((await checkDesignHealth(doc, [0])).some((i) => i.kind === "contrast")).toBe(true);
  });
});
