export type BulkData = { headers: string[]; rows: string[][] };
export type DriveSpreadsheet = { id: string; name: string; modifiedTime?: string };

export function buildSheetRange(sheetName: string, range: string): string {
  const value = String(range || "A1:Z1000").trim();
  const sheet = String(sheetName || "").trim();
  if (!sheet || value.includes("!")) return value;
  return `'${sheet.replace(/'/g, "''")}'!${value}`;
}

async function accessToken(): Promise<string> {
  const response = await fetch("/api/google/token", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Conecta Google Sheets para continuar.");
  const data = await response.json() as { accessToken?: string };
  if (!data.accessToken) throw new Error("La autorización de Google Sheets expiró.");
  return data.accessToken;
}

async function googleFetch(url: string): Promise<any> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (!response.ok) {
    if (response.status === 401) throw new Error("La autorización de Google Sheets expiró.");
    if (response.status === 403) throw new Error("No tienes permiso para acceder a esta hoja.");
    if (response.status === 404) throw new Error("No se encontró la hoja seleccionada.");
    if (response.status === 400) throw new Error("El rango o la pestaña de Google Sheets no son válidos.");
    throw new Error(`Google respondió con error ${response.status}.`);
  }
  return response.json();
}

export async function listDriveSpreadsheets(): Promise<DriveSpreadsheet[]> {
  const files: DriveSpreadsheet[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    url.searchParams.set("fields", "nextPageToken,files(id,name,modifiedTime)");
    url.searchParams.set("orderBy", "name");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await googleFetch(url.toString());
    if (Array.isArray(data.files)) files.push(...data.files);
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return files;
}

export async function listSheetTabs(spreadsheetId: string): Promise<string[]> {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`);
  url.searchParams.set("fields", "sheets.properties.title");
  const data = await googleFetch(url.toString());
  return (data.sheets ?? []).map((sheet: any) => sheet.properties?.title).filter((title: unknown): title is string => Boolean(title));
}

export async function readSheet(spreadsheetId: string, sheetName: string, range: string): Promise<BulkData> {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(buildSheetRange(sheetName, range))}`);
  const data = await googleFetch(url.toString());
  const rows = (data.values ?? []).map((row: unknown) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []);
  const headers = (rows.shift() ?? []).map((header, index) => header.trim() || `Column ${index + 1}`);
  if (!headers.length || headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error("Google Sheets necesita encabezados únicos y no vacíos.");
  const normalized = rows.map((row) => headers.map((_, index) => row[index] ?? ""));
  if (!normalized.length) throw new Error("La hoja no contiene filas de datos.");
  return { headers, rows: normalized };
}
