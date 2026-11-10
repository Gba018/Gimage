import { describe, expect, it, vi } from "vitest";
import { parseCsv } from "@/lib/design/csv";
import { blankDoc } from "@/lib/design/types";
import { exportCsvTemplates } from "@/components/editor/bulk-export";
import { renderPage } from "@/components/editor/fabric-setup";

vi.mock("@/components/editor/fabric-setup", () => ({ renderPage: vi.fn(async () => "data:image/png;base64,UE5H") }));

describe("bulk generation", () => {
  it("renders every row/page with substituted text, reports progress and leaves the source unchanged", async () => {
    const doc = blankDoc(100, 100); doc.pages[0].objects = [{ type: "Text", text: "{{name}}" }];
    const progress = vi.fn();
    const blob = await exportCsvTemplates(doc, parseCsv("name\nAda\nGrace"), { name: "name" }, { signal: new AbortController().signal, onProgress: progress });
    expect(blob.type).toBe("application/zip");
    expect(vi.mocked(renderPage).mock.calls.slice(-2).map((args) => args[0].objects[0].text)).toEqual(["Ada", "Grace"]);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
    expect(doc.pages[0].objects[0].text).toBe("{{name}}");
  });
  it("honors cancellation between pages and does not return a partial archive", async () => {
    const abort = new AbortController();
    await expect(exportCsvTemplates(blankDoc(100, 100), parseCsv("name\nAda\nGrace"), {}, { signal: abort.signal, onProgress: () => abort.abort() })).rejects.toThrow();
  });
  it("rejects batches above the graphic count limit before rendering", async () => {
    const doc = blankDoc(100, 100); doc.pages = Array.from({ length: 100 }, (_, i) => ({ ...doc.pages[0], id: `page-${i}` }));
    await expect(exportCsvTemplates(doc, parseCsv("name\n" + "Ada\n".repeat(21)), {}, { signal: new AbortController().signal, onProgress: vi.fn() })).rejects.toThrow("2,000");
  });
});
