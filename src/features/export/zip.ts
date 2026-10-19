/**
 * Small standards-compliant ZIP writer for OOXML (STORE mode).
 * DOCX content is plain XML/images, so we avoid introducing a runtime bundle
 * dependency and preserve full offline export support.
 */
export type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let cursor = 0;
  for (const part of parts) { output.set(part, cursor); cursor += part.length; }
  return output;
}

export function makeZip(entries: ZipEntry[]): Uint8Array {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let position = 0;
  let count = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const payload = entry.data;
    if (name.length > 0xffff || payload.length > 0xffffffff) {
      throw new Error("Слишком большой ресурс для DOCX");
    }
    const checksum = crc32(payload);
    const localHeader = new Uint8Array(30 + name.length);
    const lh = new DataView(localHeader.buffer);
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true); // UTF-8 paths
    lh.setUint16(8, 0, true); // STORE, no compression
    lh.setUint32(14, checksum, true);
    lh.setUint32(18, payload.length, true);
    lh.setUint32(22, payload.length, true);
    lh.setUint16(26, name.length, true);
    localHeader.set(name, 30);
    local.push(localHeader, payload);

    const centralHeader = new Uint8Array(46 + name.length);
    const ch = new DataView(centralHeader.buffer);
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint32(16, checksum, true);
    ch.setUint32(20, payload.length, true);
    ch.setUint32(24, payload.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, position, true);
    centralHeader.set(name, 46);
    central.push(centralHeader);
    position += localHeader.length + payload.length;
    count += 1;
  }
  if (count > 0xffff) throw new Error("Слишком много файлов в DOCX");
  const directory = concat(central);
  const footer = new Uint8Array(22);
  const end = new DataView(footer.buffer);
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, count, true);
  end.setUint16(10, count, true);
  end.setUint32(12, directory.length, true);
  end.setUint32(16, position, true);
  return concat([...local, directory, footer]);
}
