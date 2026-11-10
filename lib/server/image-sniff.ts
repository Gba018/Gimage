export type RasterMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** Detects raster image types from magic bytes; the client-declared type is never trusted. */
export function sniffImageType(bytes: Uint8Array): RasterMime | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (bytes.length >= 6) {
    const head = String.fromCharCode(...bytes.subarray(0, 6));
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.subarray(0, 4));
    const webp = String.fromCharCode(...bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return null;
}

/** Reads pixel dimensions for PNG, GIF and baseline/progressive JPEG headers. */
export function readImageSize(bytes: Uint8Array, mime: RasterMime): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (mime === "image/png" && bytes.length >= 24) {
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (mime === "image/gif" && bytes.length >= 10) {
      return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    }
    if (mime === "image/jpeg") {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) return null;
        const marker = bytes[offset + 1];
        const length = view.getUint16(offset + 2);
        const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
        offset += 2 + length;
      }
    }
  } catch {
    return null;
  }
  return null;
}
