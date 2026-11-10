import type { DesignDoc, SerializedObject } from "./types";

export const MAX_CSV_ROWS = 500;
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
const FIELD = /\{\{\s*([^{}]+?)\s*\}\}/g;
export type CsvData = { headers: string[]; rows: string[][] };

/** RFC 4180 fields, including escaped quotes, embedded newlines and UTF-8 BOM. */
export function parseCsv(source: string): CsvData {
  if (new TextEncoder().encode(source).length > MAX_CSV_BYTES) throw new Error("CSV must be 2 MB or smaller");
  const text = source.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  function endRow() {
    row.push(field);
    if (row.some((cell) => cell !== "")) records.push(row);
    if (records.length > MAX_CSV_ROWS + 1) throw new Error(`CSV supports up to ${MAX_CSV_ROWS} data rows`);
    row = []; field = ""; closed = false;
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ",") { row.push(field); field = ""; closed = false; }
    else if (c === "\n" || c === "\r") { endRow(); if (c === "\r" && text[i + 1] === "\n") i++; }
    else if (c === '"' && !field && !closed) quoted = true;
    else if (closed || c === '"') throw new Error("Invalid CSV quoting");
    else field += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  endRow();
  const headers = records.shift()?.map((h) => h.trim()) ?? [];
  if (!headers.length || headers.some((h) => !h)) throw new Error("CSV needs a non-empty header for each column");
  if (new Set(headers).size !== headers.length) throw new Error("CSV column headers must be unique");
  if (!records.length) throw new Error("CSV needs at least one data row");
  if (records.some((r) => r.length !== headers.length)) throw new Error("Every CSV row must have the same number of columns as the header");
  return { headers, rows: records };
}

export function templateFields(doc: DesignDoc): string[] {
  const fields = new Set<string>();
  function visit(objects: SerializedObject[]) {
    for (const obj of objects) {
      if (typeof obj.text === "string") for (const match of obj.text.matchAll(FIELD)) fields.add(match[1].trim());
      if (Array.isArray(obj.objects)) visit(obj.objects as SerializedObject[]);
    }
  }
  doc.pages.forEach((p) => visit(p.objects));
  return [...fields];
}

/** Replace literal text once: CSV content is never re-interpreted as a template. */
export function fillTemplate(doc: DesignDoc, data: CsvData, rowIndex: number, mapping: Record<string, string>): DesignDoc {
  const row = data.rows[rowIndex];
  if (!row) throw new Error("CSV row is missing");
  const values = new Map(data.headers.map((h, i) => [h, row[i]]));
  function visit(objects: SerializedObject[]): SerializedObject[] {
    return objects.map((obj) => {
      const next = { ...obj };
      if (typeof obj.text === "string") {
        next.text = obj.text.replace(FIELD, (_, key: string) => {
          const column = mapping[key.trim()];
          if (!values.has(column)) throw new Error(`Map the field "${key.trim()}" to a CSV column`);
          return values.get(column)!;
        });
        // Character positions change after replacement; retain whole-object styling.
        if (next.text !== obj.text) next.styles = {};
      }
      if (Array.isArray(obj.objects)) next.objects = visit(obj.objects as SerializedObject[]);
      return next;
    });
  }
  return { ...doc, pages: doc.pages.map((page) => ({ ...page, objects: visit(page.objects) })) };
}
