/**
 * Generate brand-consistent PNGs without a native-image dependency.
 * PNG previews matter: many social crawlers do not render SVG og:image links.
 * All raster assets are deterministic and built together with the static site.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

function crc32(bytes) {
  let crc = -1;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const label = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([length, label, data, checksum]);
}

function encodePng(width, height, rgba) {
  const scanline = 1 + width * 4;
  const rows = Buffer.alloc(height * scanline);
  for (let y = 0; y < height; y++) {
    rows[y * scanline] = 0;
    rgba.copy(rows, y * scanline + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const COLORS = {
  navy: [19, 49, 67],
  blue: [12, 91, 140],
  cyan: [47, 141, 165],
  cream: [255, 253, 248],
  gold: [242, 184, 75],
  faint: [202, 227, 229],
};

function canvas(w, h) {
  const rgba = Buffer.alloc(w * h * 4, 255);
  const pixel = (x, y, color, alpha = 1) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const offset = (y * w + x) * 4;
    for (let index = 0; index < 3; index++) {
      rgba[offset + index] = Math.round(rgba[offset + index] * (1 - alpha) + color[index] * alpha);
    }
    rgba[offset + 3] = 255;
  };
  const rect = (x, y, width, height, color, alpha = 1) => {
    const left = Math.max(0, Math.floor(x));
    const top = Math.max(0, Math.floor(y));
    const right = Math.min(w, Math.ceil(x + width));
    const bottom = Math.min(h, Math.ceil(y + height));
    for (let yy = top; yy < bottom; yy++) for (let xx = left; xx < right; xx++) pixel(xx, yy, color, alpha);
  };
  const circle = (cx, cy, radius, color, alpha = 1) => {
    const r2 = radius * radius;
    for (let yy = Math.max(0, Math.floor(cy - radius)); yy < Math.min(h, Math.ceil(cy + radius)); yy++) {
      for (let xx = Math.max(0, Math.floor(cx - radius)); xx < Math.min(w, Math.ceil(cx + radius)); xx++) {
        if ((xx - cx) ** 2 + (yy - cy) ** 2 <= r2) pixel(xx, yy, color, alpha);
      }
    }
  };
  const ellipse = (cx, cy, rx, ry, color, alpha = 1) => {
    for (let yy = Math.max(0, Math.floor(cy - ry)); yy < Math.min(h, Math.ceil(cy + ry)); yy++) {
      for (let xx = Math.max(0, Math.floor(cx - rx)); xx < Math.min(w, Math.ceil(cx + rx)); xx++) {
        if (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1) pixel(xx, yy, color, alpha);
      }
    }
  };
  const roundRect = (x, y, width, height, radius, color, alpha = 1) => {
    rect(x + radius, y, width - 2 * radius, height, color, alpha);
    rect(x, y + radius, width, height - 2 * radius, color, alpha);
    for (const dx of [radius, width - radius]) for (const dy of [radius, height - radius]) circle(x + dx, y + dy, radius, color, alpha);
  };
  return { w, h, rgba, pixel, rect, circle, ellipse, roundRect };
}

function symbol(c, cx, cy, radius) {
  const k = radius / 115;
  c.circle(cx, cy, radius, COLORS.cream, .97);
  c.circle(cx, cy, radius * .91, COLORS.blue);
  c.circle(cx - 29 * k, cy - 20 * k, 38 * k, COLORS.gold);
  c.ellipse(cx + 7 * k, cy + 33 * k, 69 * k, 21 * k, COLORS.cream);
  c.circle(cx - 25 * k, cy + 20 * k, 28 * k, COLORS.cream);
  c.circle(cx + 5 * k, cy + 6 * k, 35 * k, COLORS.cream);
  c.circle(cx + 38 * k, cy + 26 * k, 29 * k, COLORS.cream);
}

const GLYPHS = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01111","10000","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  W: ["10001","10001","10001","10101","10101","10101","01010"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};

function label(c, value, x, y, scale, color) {
  const step = 6 * scale;
  for (const char of value.toUpperCase()) {
    const rows = GLYPHS[char] ?? GLYPHS[" "];
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < 5; col++) if (rows[row][col] === "1") {
        c.rect(x + col * scale, y + row * scale, scale, scale, color);
      }
    }
    x += step;
  }
}

async function save(pathname, c) {
  await writeFile(pathname, encodePng(c.w, c.h, c.rgba));
}

const output = path.resolve("dist/public");
await mkdir(path.join(output, "icons"), { recursive: true });

for (const size of [192, 512]) {
  const c = canvas(size, size);
  for (let y = 0; y < size; y++) {
    const t = y / size;
    c.rect(0, y, size, 1, [
      Math.round(12 * (1 - t) + 19 * t),
      Math.round(91 * (1 - t) + 49 * t),
      Math.round(140 * (1 - t) + 67 * t),
    ]);
  }
  symbol(c, size / 2, size / 2, size * .39);
  await save(path.join(output, "icons", `icon-${size}.png`), c);
}

const cover = canvas(1200, 630);
for (let y = 0; y < 630; y++) {
  const t = y / 630;
  cover.rect(0, y, 1200, 1, [
    Math.round(19 + t * 7), Math.round(49 + t * 36), Math.round(67 + t * 55),
  ]);
}
cover.rect(0, 0, 1200, 12, COLORS.gold);
for (let i = 0; i < 14; i++) {
  cover.circle(1050 + (i % 4) * 45, 82 + Math.floor(i / 4) * 45, 3, COLORS.faint, .42);
}
cover.ellipse(250, 345, 285, 255, COLORS.cyan, .3);
cover.circle(270, 295, 205, COLORS.cream, .1);
symbol(cover, 286, 295, 168);
cover.roundRect(496, 187, 644, 250, 22, COLORS.cream, .08);
label(cover, "METEO DZ", 535, 235, 12, COLORS.cream);
cover.rect(535, 361, 485, 3, COLORS.gold);
label(cover, "ALGERIAN WEATHER", 537, 396, 4, COLORS.faint);
label(cover, "FORECASTS", 539, 479, 3, COLORS.gold);
cover.rect(0, 609, 1200, 21, COLORS.gold);
await save(path.join(output, "social-preview.png"), cover);

console.log("Generated branded Open Graph preview (1200×630) and PNG PWA icons (192/512).");
