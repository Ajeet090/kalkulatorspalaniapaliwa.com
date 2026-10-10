/**
 * Generates favicon.ico from favicon.svg using sharp.
 * Produces a valid multi-size ICO file (16x16 + 32x32 PNG frames).
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath  = join(__dirname, '../public/favicon.svg');
const icoPath  = join(__dirname, '../public/favicon.ico');

const svgBuffer = readFileSync(svgPath);

// Generate PNG buffers at each required size
const sizes = [16, 32, 48];
const pngs  = await Promise.all(
  sizes.map(s => sharp(svgBuffer).resize(s, s).png().toBuffer())
);

/**
 * Build a valid ICO container from an array of PNG buffers.
 * ICO format reference: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function buildIco(pngBuffers, imgSizes) {
  const count      = pngBuffers.length;
  const headerSize = 6;                  // ICONDIR
  const dirEntry   = 16;                 // ICONDIRENTRY per image
  const dataOffset = headerSize + (dirEntry * count);

  let offset = dataOffset;
  const entries = pngBuffers.map((buf, i) => {
    const entry = { buf, size: buf.length, offset, w: imgSizes[i], h: imgSizes[i] };
    offset += buf.length;
    return entry;
  });

  const total = offset;
  const ico   = Buffer.alloc(total);
  let pos     = 0;

  // ICONDIR
  ico.writeUInt16LE(0,     pos); pos += 2; // Reserved = 0
  ico.writeUInt16LE(1,     pos); pos += 2; // Type = 1 (ICO)
  ico.writeUInt16LE(count, pos); pos += 2; // Count

  // ICONDIRENTRY × N
  for (const e of entries) {
    const w = e.w >= 256 ? 0 : e.w;
    const h = e.h >= 256 ? 0 : e.h;
    ico.writeUInt8(w,        pos); pos += 1; // Width  (0 means 256)
    ico.writeUInt8(h,        pos); pos += 1; // Height (0 means 256)
    ico.writeUInt8(0,        pos); pos += 1; // ColorCount = 0 (truecolor)
    ico.writeUInt8(0,        pos); pos += 1; // Reserved
    ico.writeUInt16LE(1,     pos); pos += 2; // Planes
    ico.writeUInt16LE(32,    pos); pos += 2; // BitCount
    ico.writeUInt32LE(e.size,   pos); pos += 4; // SizeInBytes
    ico.writeUInt32LE(e.offset, pos); pos += 4; // ImageOffset
  }

  // Write PNG image data
  for (const e of entries) {
    e.buf.copy(ico, e.offset);
  }

  return ico;
}

const ico = buildIco(pngs, sizes);
writeFileSync(icoPath, ico);

// Verify: first 4 bytes should be 0x00 0x00 0x01 0x00
const magic = [...ico.slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log(`✓ favicon.ico written — ${ico.length} bytes, ${sizes.length} sizes (${sizes.join('+')}px)`);
console.log(`  ICO header magic: ${magic} (expected: 00 00 01 00)`);
