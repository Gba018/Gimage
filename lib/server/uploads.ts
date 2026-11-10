import "server-only";
import { generateToken } from "./passwords";
import { execute, query, queryOne } from "./db";
import { readImageSize, sniffImageType, type RasterMime } from "./image-sniff";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOADS_PER_USER = 500;

export type UploadSummary = {
  id: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  createdAt: number;
};

type UploadRow = Omit<UploadSummary, "url" | "createdAt"> & { created_at: number };

export class UploadError extends Error {}

export function uploadUrl(id: string): string {
  return `/api/uploads/${id}`;
}

function toSummary(row: UploadRow): UploadSummary {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    url: uploadUrl(row.id),
    createdAt: row.created_at,
  };
}

export async function saveUpload(ownerId: string, name: string, bytes: Uint8Array): Promise<UploadSummary> {
  if (bytes.length === 0) throw new UploadError("File is empty");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new UploadError("File is larger than 10 MB");
  const mime = sniffImageType(bytes);
  if (!mime) throw new UploadError("Only PNG, JPEG, WebP and GIF images are supported");
  const row = await queryOne<{ count: number }>("SELECT count(*)::int AS count FROM uploads WHERE owner_id = $1", [ownerId]);
  if ((row?.count ?? 0) >= MAX_UPLOADS_PER_USER) throw new UploadError("Upload limit reached. Delete some uploads first.");
  const size = readImageSize(bytes, mime);
  // Upload ids double as unguessable capability URLs so shared designs can display them.
  const id = generateToken(18);
  const safeName = name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "image";
  const now = Date.now();
  await execute(
    "INSERT INTO uploads (id, owner_id, name, mime, size, width, height, data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id, ownerId, safeName, mime, bytes.length, size?.width ?? null, size?.height ?? null, Buffer.from(bytes), now],
  );
  return toSummary({ id, name: safeName, mime, size: bytes.length, width: size?.width ?? null, height: size?.height ?? null, created_at: now });
}

export async function listUploads(ownerId: string): Promise<UploadSummary[]> {
  const rows = await query<UploadRow>(
    "SELECT id, name, mime, size, width, height, created_at FROM uploads WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId],
  );
  return rows.map(toSummary);
}

export async function getUploadData(id: string): Promise<{ mime: RasterMime; data: Uint8Array } | null> {
  const row = await queryOne<{ mime: RasterMime; data: Buffer }>("SELECT mime, data FROM uploads WHERE id = $1", [id]);
  return row ?? null;
}

export async function getOwnedUploadData(ownerId: string, id: string): Promise<{ mime: RasterMime; data: Uint8Array } | null> {
  return (await queryOne<{ mime: RasterMime; data: Uint8Array }>("SELECT mime, data FROM uploads WHERE id = $1 AND owner_id = $2", [id, ownerId])) ?? null;
}

export async function deleteUpload(ownerId: string, id: string): Promise<boolean> {
  return (await execute("DELETE FROM uploads WHERE id = $1 AND owner_id = $2", [id, ownerId])) > 0;
}
