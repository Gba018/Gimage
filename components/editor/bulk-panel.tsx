"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fillTemplate, MAX_CSV_BYTES, MAX_CSV_ROWS, parseCsv, templateFields, type CsvData } from "@/lib/design/csv";
import { DesignPreview } from "@/components/design-preview";
import { Button } from "@/components/ui/button";
import { listDriveSpreadsheets, listSheetTabs, readSheet, type DriveSpreadsheet } from "@/lib/google/sheets-client";
import { useEditor } from "./editor-context";

type Source = "csv" | "sheets";
type SheetPrefs = { spreadsheetId: string; sheetName: string; range: string };
const SHEET_PREFS_KEY = "gimage_bulk_sheet_preferences";

function readSheetPrefs(): SheetPrefs | null {
  try {
    const value = JSON.parse(localStorage.getItem(SHEET_PREFS_KEY) ?? "null") as Partial<SheetPrefs> | null;
    if (!value || typeof value.spreadsheetId !== "string" || typeof value.sheetName !== "string" || typeof value.range !== "string") return null;
    return value as SheetPrefs;
  } catch {
    return null;
  }
}

function writeSheetPrefs(value: SheetPrefs): void {
  try { localStorage.setItem(SHEET_PREFS_KEY, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
}

export function BulkPanel() {
  const { engine, state, notify } = useEditor();
  const [source, setSource] = useState<Source>("sheets");
  const [data, setData] = useState<CsvData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [row, setRow] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheet[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [range, setRange] = useState("A1:Z1000");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const fileToken = useRef(0);
  const restoredSheets = useRef(false);
  useEffect(() => () => { controller.current?.abort(); fileToken.current++; }, []);

  const doc = useMemo(() => engine.toDoc(), [engine, state.revision]);
  const fields = useMemo(() => templateFields(doc), [doc]);
  const resolved = useMemo(() => Object.fromEntries(fields.map((field) => [field, Object.hasOwn(mapping, field) ? mapping[field] : (data?.headers.includes(field) ? field : "")])), [fields, mapping, data]);
  const mapped = !!data && fields.length > 0 && fields.every((field) => data.headers.includes(resolved[field]));
  const preview = useMemo(() => data && mapped ? fillTemplate(doc, data, row, resolved) : null, [data, mapped, doc, row, resolved]);
  const selectedCount = selectedRows.size;
  const allSelected = !!data && selectedCount === data.rows.length;

  function setRows(next: CsvData) {
    if (next.rows.length > MAX_CSV_ROWS) throw new Error(`Google Sheets supports up to ${MAX_CSV_ROWS} data rows per batch.`);
    setData(next); setRow(0); setSelectedRows(new Set(next.rows.map((_, index) => index))); setError("");
  }

  async function loadCsv(file?: File) {
    if (!file) return;
    const token = ++fileToken.current;
    setData(null); setMapping({}); setSelectedRows(new Set()); setError("");
    try {
      if (file.size > MAX_CSV_BYTES) throw new Error("CSV must be 2 MB or smaller");
      const parsed = parseCsv(await file.text());
      if (fileToken.current === token) setRows(parsed);
    } catch (err) { if (fileToken.current === token) setError(err instanceof Error ? err.message : "Could not read CSV"); }
  }

  async function connectSheets() {
    setLoadingSheets(true); setError("");
    try {
      setDriveFiles(await listDriveSpreadsheets());
    } catch (err) {
      const next = encodeURIComponent(window.location.pathname);
      if (/not connected|authorization expired|Conecta Google/i.test(String(err))) window.location.href = `/api/google/oauth/start?next=${next}`;
      else setError(err instanceof Error ? err.message : "Could not load Google Sheets");
    } finally { setLoadingSheets(false); }
  }

  async function restoreSheets() {
    if (restoredSheets.current || source !== "sheets") return;
    restoredSheets.current = true;
    const prefs = readSheetPrefs();
    setLoadingSheets(true);
    setError("");
    try {
      const files = await listDriveSpreadsheets();
      setDriveFiles(files);
      const file = files.find((item) => item.id === prefs?.spreadsheetId) ?? files[0];
      if (!file) throw new Error("No se encontraron hojas de cálculo disponibles.");
      setSpreadsheetId(file.id);
      const nextTabs = await listSheetTabs(file.id);
      setTabs(nextTabs);
      const nextSheet = nextTabs.includes(prefs?.sheetName ?? "") ? prefs!.sheetName : nextTabs[0] ?? "";
      setSheetName(nextSheet);
      const nextRange = prefs?.range || "A1:Z1000";
      setRange(nextRange);
      if (nextSheet) {
        setRows(await readSheet(file.id, nextSheet, nextRange));
        writeSheetPrefs({ spreadsheetId: file.id, sheetName: nextSheet, range: nextRange });
      }
    } catch (err) {
      restoredSheets.current = false;
      if (/not connected|authorization expired|Conecta Google/i.test(String(err))) {
        setError("Conecta Google Sheets para cargar automáticamente tu última hoja.");
      } else setError(err instanceof Error ? err.message : "Could not load Google Sheets");
    } finally { setLoadingSheets(false); }
  }

  useEffect(() => {
    if (source === "sheets" && state.ready) void restoreSheets();
  }, [source, state.ready]);

  async function selectSpreadsheet(id: string) {
    setSpreadsheetId(id); setTabs([]); setSheetName(""); setData(null); setError("");
    if (!id) return;
    setLoadingSheets(true);
    try { const nextTabs = await listSheetTabs(id); setTabs(nextTabs); setSheetName(nextTabs[0] ?? ""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load sheet tabs"); }
    finally { setLoadingSheets(false); }
  }

  async function loadSheet() {
    if (!spreadsheetId || !sheetName) return;
    setLoadingSheets(true); setError("");
    try {
      setRows(await readSheet(spreadsheetId, sheetName, range));
      writeSheetPrefs({ spreadsheetId, sheetName, range });
    }
    catch (err) { setError(err instanceof Error ? err.message : "Could not read Google Sheets"); }
    finally { setLoadingSheets(false); }
  }

  async function run() {
    if (!data || !mapped || !selectedRows.size || controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    const rowIndexes = [...selectedRows].sort((a, b) => a - b);
    setProgress({ done: 0, total: rowIndexes.length * doc.pages.length }); setError("");
    try {
      const { exportCsvTemplates } = await import("./bulk-export");
      const blob = await exportCsvTemplates(doc, data, resolved, { rowIndexes, signal: abort.signal, onProgress: (done, total) => { if (!abort.signal.aborted) setProgress({ done, total }); } });
      abort.signal.throwIfAborted();
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = "gimage-bulk-graphics.zip"; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      notify("Bulk graphics ZIP downloaded");
    } catch (err) { if (!abort.signal.aborted) setError(err instanceof Error ? err.message : "Bulk export failed"); }
    finally { controller.current = null; setProgress(null); }
  }

  return <div className="space-y-4 text-sm">
    <p className="text-ink-600">Add placeholders such as <code>{"{{name}}"}</code> and <code>{"{{price}}"}</code> to text layers. Choose CSV or connect your Google Sheets account.</p>
    <div className="flex gap-2"><Button variant={source === "csv" ? "primary" : "secondary"} disabled={!!progress} onClick={() => setSource("csv")}>CSV</Button><Button variant={source === "sheets" ? "primary" : "secondary"} disabled={!!progress} onClick={() => setSource("sheets")}>Google Sheets</Button></div>
    {source === "csv" ? <label className="block font-medium text-ink-700">CSV file<input className="mt-2 block w-full text-xs" type="file" accept=".csv,text/csv" disabled={!!progress} onChange={(e) => { void loadCsv(e.target.files?.[0]); e.target.value = ""; }} /></label> : <div className="space-y-3 rounded-lg border border-ink-200 p-3">
      <Button variant="secondary" disabled={loadingSheets || !!progress} onClick={() => void connectSheets()}>{loadingSheets ? "Connecting…" : "Connect / load my Sheets"}</Button>
      {driveFiles.length > 0 && <><label className="block text-xs font-medium">Spreadsheet<select className="mt-1 h-9 w-full rounded-lg border border-ink-200 bg-white px-2" value={spreadsheetId} disabled={loadingSheets || !!progress} onChange={(e) => void selectSpreadsheet(e.target.value)}><option value="">Choose a spreadsheet</option>{driveFiles.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}</select></label><label className="block text-xs font-medium">Sheet tab<select className="mt-1 h-9 w-full rounded-lg border border-ink-200 bg-white px-2" value={sheetName} disabled={!spreadsheetId || loadingSheets || !!progress} onChange={(e) => setSheetName(e.target.value)}><option value="">Choose a tab</option>{tabs.map((tab) => <option key={tab} value={tab}>{tab}</option>)}</select></label><label className="block text-xs font-medium">Range<input className="mt-1 h-9 w-full rounded-lg border border-ink-200 px-2" value={range} disabled={loadingSheets || !!progress} onChange={(e) => setRange(e.target.value)} /></label><Button className="w-full" disabled={!spreadsheetId || !sheetName || loadingSheets || !!progress} onClick={() => void loadSheet()}>Read selected sheet</Button></>}
    </div>}
    <p className="text-xs text-ink-500">Up to {MAX_CSV_ROWS} rows / 2 MB. Data is processed in the browser.</p>
    {!fields.length && <p className="rounded-lg bg-ink-50 p-3 text-ink-600">No placeholders found. Edit a text layer to include {"{{name}}"}.</p>}
    {data && <><div className="flex items-center justify-between font-medium"><span>{data.rows.length} rows · {selectedCount} selected · {doc.pages.length} pages</span><button type="button" className="text-xs text-brand-600" disabled={!!progress} onClick={() => setSelectedRows(allSelected ? new Set() : new Set(data.rows.map((_, index) => index)))}>{allSelected ? "Clear all" : "Select all"}</button></div><div className="max-h-36 space-y-1 overflow-auto rounded border border-ink-200 p-2">{data.rows.map((values, index) => <label key={index} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedRows.has(index)} disabled={!!progress} onChange={() => setSelectedRows((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} />Row {index + 1}{values[0] ? ` · ${values[0]}` : ""}</label>)}</div>{fields.map((field) => <label key={field} className="block text-xs font-medium text-ink-700">{`{{${field}}}`}<select className="mt-1 h-9 w-full rounded-lg border border-ink-200 bg-white px-2" value={resolved[field]} disabled={!!progress} onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}><option value="">Choose a column</option>{data.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}{preview && <><label className="block text-xs font-medium">Preview row<input className="ml-2 w-20 rounded border border-ink-200 p-1" type="number" min={1} max={data.rows.length} disabled={!!progress} value={row + 1} onChange={(e) => setRow(Math.max(0, Math.min(data.rows.length - 1, Number(e.target.value) - 1 || 0)))} /></label>{preview.pages.map((page, index) => <DesignPreview key={page.id} page={page} width={preview.width} height={preview.height} alt={`Row ${row + 1}, page ${index + 1}`} className="rounded-lg ring-1 ring-ink-200" />)}<p className="text-xs text-ink-500">The original design stays editable; generated copies download as PNGs.</p></>}<Button className="w-full" disabled={!mapped || !selectedCount || !!progress} onClick={() => void run()}>Download {selectedCount * doc.pages.length} PNGs as ZIP</Button></>}
    {progress && <div aria-live="polite" className="space-y-2"><p>Rendering {progress.done} / {progress.total} graphics…</p><progress className="w-full" max={progress.total} value={progress.done} /><Button variant="secondary" onClick={() => controller.current?.abort()}>Cancel export</Button></div>}
    {error && <p role="alert" className="text-danger-600">{error}</p>}
  </div>;
}
