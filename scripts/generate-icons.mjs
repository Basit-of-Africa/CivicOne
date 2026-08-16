#!/usr/bin/env node
/**
 * Generates the CivicOne PWA/app icons as true-color PNGs with supersampled
 * anti-aliasing (no external image dependencies).
 *
 * Outputs to /public/icons:
 *   icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
 *
 * Run: node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");

const NAVY = [16, 42, 67]; // #102A43
const WHITE = [255, 255, 255];
const AMBER = [242, 177, 52]; // #F2B134

// --- CRC32 ----------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// --- PNG encoding ---------------------------------------------------------
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, pixels) {
  // pixels: Uint8Array of length width*height*3 (RGB)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 3;
      const dst = rowStart + 1 + x * 3;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Glyph ----------------------------------------------------------------
/**
 * House / civic mark. Coordinates are normalised to [0,1] so any canvas size
 * works. Returns WHITE if the point is inside the glyph, else NAVY (or AMBER
 * for the door highlight).
 */
function sampleGlyph(px, py) {
  // Roof
  const roofLeft = (x) => 0.297 - ((x - 0.25) / 0.25) * 0.156; // 232..152 at 512
  const roofRight = (x) => 0.297 - ((0.75 - x) / 0.25) * 0.156;
  const roofY = (x) => (x < 0.5 ? roofLeft(x) : roofRight(x));

  const inBuilding =
    px >= 0.25 &&
    px <= 0.75 &&
    py >= roofY(px) &&
    py <= 0.828; // 424/512

  if (!inBuilding) return NAVY;

  // Door cutout
  const inDoor = px >= 0.469 && px <= 0.594 && py >= 0.578 && py <= 0.828;
  if (inDoor) return AMBER;

  // Window cutouts
  const inWindow =
    (px >= 0.344 && px <= 0.406 && py >= 0.531 && py <= 0.594) ||
    (px >= 0.594 && px <= 0.656 && py >= 0.531 && py <= 0.594);
  if (inWindow) return NAVY;

  return WHITE;
}

function render(size, { scale = 1 } = {}) {
  const pixels = new Uint8Array(size * size * 3);
  const cx = size / 2;
  const cy = size / 2;
  const half = (size * 0.5) * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 2x2 supersampling
      let r = 0;
      let g = 0;
      let b = 0;
      for (const [sx, sy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        const px = cx + ((x + sx - size / 2) / size) * 2 * half;
        const py = cy + ((y + sy - size / 2) / size) * 2 * half;
        const [cr, cg, cb] = sampleGlyph(px / size, py / size);
        r += cr;
        g += cg;
        b += cb;
      }
      const idx = (y * size + x) * 3;
      pixels[idx] = Math.round(r / 4);
      pixels[idx + 1] = Math.round(g / 4);
      pixels[idx + 2] = Math.round(b / 4);
    }
  }
  return encodePNG(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const jobs = [
  ["icon-192.png", () => render(192)],
  ["icon-512.png", () => render(512)],
  ["icon-maskable-512.png", () => render(512, { scale: 0.78 })],
  ["apple-touch-icon.png", () => render(180)],
];

for (const [name, make] of jobs) {
  writeFileSync(join(OUT_DIR, name), make());
  console.log(`wrote ${name}`);
}
