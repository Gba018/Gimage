/** Small ZIP writer using STORE entries; avoids a compression dependency for PNGs. */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function zipFiles(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: BlobPart[] = [], central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    let crc = 0xffffffff;
    for (const byte of file.data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint16(12, 0x21, true); // DOS date: 1980-01-01
    h.setUint32(14, crc, true); h.setUint32(18, file.data.length, true); h.setUint32(22, file.data.length, true);
    h.setUint16(26, name.length, true); header.set(name, 30);
    parts.push(header, new Uint8Array(file.data));
    const entry = new Uint8Array(46 + name.length), e = new DataView(entry.buffer);
    e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x800, true);
    e.setUint16(14, 0x21, true); e.setUint32(16, crc, true); e.setUint32(20, file.data.length, true);
    e.setUint32(24, file.data.length, true); e.setUint16(28, name.length, true); e.setUint32(42, offset, true);
    entry.set(name, 46); central.push(entry); offset += header.length + file.data.length;
  }
  const end = new Uint8Array(22), view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true); view.setUint16(8, files.length, true); view.setUint16(10, files.length, true);
  view.setUint32(12, central.reduce((n, e) => n + e.length, 0), true); view.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
