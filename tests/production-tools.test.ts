import { describe, expect, it } from "vitest";
import { fillTemplate, parseCsv, templateFields, MAX_CSV_ROWS } from "@/lib/design/csv";
import { contrastRatio, solidRgb } from "@/lib/design/contrast";
import { zipFiles } from "@/lib/design/zip";
import { blankDoc, parseDesignDoc } from "@/lib/design/types";

describe("CSV-driven templates", () => {
  it("reads BOM, CRLF, commas, escaped quotes and multiline values", () => {
    expect(parseCsv('\uFEFFname,description\r\nAda,"Hello, ""friend""\nWelcome"\r\n')).toEqual({ headers: ["name", "description"], rows: [["Ada", 'Hello, "friend"\nWelcome']] });
  });
  it.each(["", "name", "name,name\na,b", ",price\na,2", "name,price\na", 'name\n"unclosed', 'name\na"b', 'name\n"a"tail'])('rejects invalid CSV %j', (source) => expect(() => parseCsv(source)).toThrow());
  it("enforces the row limit and accepts empty cells", () => {
    expect(parseCsv("name,price\n,10").rows).toEqual([["", "10"]]);
    expect(() => parseCsv("name\n" + "a\n".repeat(MAX_CSV_ROWS + 1))).toThrow("500");
  });
  it("maps repeated and nested fields without mutating the template or interpreting CSV values", () => {
    const doc = blankDoc(100, 100);
    doc.pages[0].objects = [{ type: "Textbox", text: "Hi {{ name }} / {{name}}", styles: { 0: { 0: { fill: "red" } } } }, { type: "Group", objects: [{ type: "IText", text: "{{price}}" }] }];
    expect(templateFields(doc)).toEqual(["name", "price"]);
    const result = fillTemplate(doc, parseCsv("customer,cost\n{{price}},$10"), 0, { name: "customer", price: "cost" });
    expect(result.pages[0].objects[0].text).toBe("Hi {{price}} / {{price}}");
    expect(result.pages[0].objects[0].styles).toEqual({});
    expect(JSON.stringify(result)).toContain("$10");
    expect(doc.pages[0].objects[0].text).toBe("Hi {{ name }} / {{name}}");
    expect(parseDesignDoc(result).ok).toBe(true);
    expect(() => fillTemplate(doc, parseCsv("name\nAda"), 0, {})).toThrow("Map the field");
  });
  it("supports special property names without inheriting object properties", () => {
    const doc = blankDoc(100, 100); doc.pages[0].objects = [{ type: "Text", text: "{{__proto__}}" }];
    const data = parseCsv("__proto__\nAda");
    expect(fillTemplate(doc, data, 0, Object.fromEntries([["__proto__", "__proto__"]])).pages[0].objects[0].text).toBe("Ada");
  });
});

describe("contrast", () => {
  it("matches standard black/white and identical-color ratios", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBe(1);
    expect(solidRgb("#abc")).toEqual([170, 187, 204]);
    expect(solidRgb("rgb(12, 34, 56)")).toEqual([12, 34, 56]);
    expect(solidRgb("rgba(0,0,0,0.5)")).toBeNull();
    expect(solidRgb("rgb(999,0,0)")).toBeNull();
  });
});

describe("ZIP archive", () => {
  it("writes valid STORE headers, CRC32, UTF-8 filenames and central offsets", async () => {
    const zip = zipFiles([{ name: "café.png", data: new TextEncoder().encode("123456789") }, { name: "page-2.png", data: new Uint8Array([0, 255]) }]);
    const buffer = await zip.arrayBuffer(), view = new DataView(buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0x800);
    expect(view.getUint32(14, true)).toBe(0xcbf43926);
    const end = buffer.byteLength - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const central = view.getUint32(end + 16, true);
    expect(view.getUint32(central, true)).toBe(0x02014b50);
    expect(view.getUint32(central + 42, true)).toBe(0);
    const nameLength = view.getUint16(26, true);
    expect(new TextDecoder().decode(buffer.slice(30, 30 + nameLength))).toBe("café.png");
    expect(new TextDecoder().decode(buffer.slice(30 + nameLength, 39 + nameLength))).toBe("123456789");
  });
});
