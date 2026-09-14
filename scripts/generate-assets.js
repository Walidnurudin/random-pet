const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcTarget), 8 + len);
  return chunk;
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw rows with filter 0
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte: 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Ensure directories exist
const iconsDir = path.join(__dirname, '..', 'src', 'assets', 'icons');
const mascotsDir = path.join(__dirname, '..', 'src', 'assets', 'mascots');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(mascotsDir, { recursive: true });

// 1. Create 32x32 Tray Icon (Orange Fox Paw/Face silhouette)
const trayPng = createPng(32, 32, (x, y, w, h) => {
  const dx = x - 16;
  const dy = y - 16;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 12) {
    return [255, 140, 0, 255]; // Orange
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(iconsDir, 'tray-icon.png'), trayPng);
fs.writeFileSync(path.join(iconsDir, 'tray-icon-active.png'), createPng(32, 32, (x, y) => {
  const dist = Math.sqrt((x-16)**2 + (y-16)**2);
  return dist < 12 ? [0, 230, 150, 255] : [0, 0, 0, 0]; // Neon Green for active
}));

// 2. Create Fox Mascot Placeholder (128x128)
const foxPng = createPng(128, 128, (x, y) => {
  const dx = x - 64;
  const dy = y - 64;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 48) {
    // Face gradient
    const t = y / 128;
    return [Math.floor(255 - t * 20), Math.floor(120 + t * 40), 20, 255];
  }
  // Ears
  if ((x > 24 && x < 54 && y > 16 && y < 50) || (x > 74 && x < 104 && y > 16 && y < 50)) {
    return [255, 100, 20, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(mascotsDir, 'mascot-fox.png'), foxPng);

// 3. Create Cat Mascot Placeholder (128x128)
const catPng = createPng(128, 128, (x, y) => {
  const dist = Math.sqrt((x - 64) ** 2 + (y - 64) ** 2);
  if (dist < 46) {
    return [100, 140, 255, 255]; // Soft Blue/Lilac Cat
  }
  if ((x > 26 && x < 52 && y > 20 && y < 52) || (x > 76 && x < 102 && y > 20 && y < 52)) {
    return [70, 110, 230, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(mascotsDir, 'mascot-cat.png'), catPng);

// 4. Create Cyber Bot Mascot Placeholder (128x128)
const botPng = createPng(128, 128, (x, y) => {
  // Rounded rect head
  if (x >= 28 && x <= 100 && y >= 32 && y <= 96) {
    // Visor in the middle
    if (x >= 38 && x <= 90 && y >= 50 && y <= 72) {
      return [0, 255, 220, 255]; // Neon cyan visor
    }
    return [40, 48, 68, 255]; // Dark slate metal
  }
  // Antenna
  if (x >= 60 && x <= 68 && y >= 16 && y <= 32) {
    return [0, 255, 220, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(mascotsDir, 'mascot-bot.png'), botPng);

console.log('✅ Generated placeholder icons and mascot assets successfully.');
