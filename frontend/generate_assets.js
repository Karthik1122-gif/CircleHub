import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// CRC32 implementation
function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
}
const crcTable = makeCrcTable();

function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function writePngChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = buf.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
}

function createPng(width, height, pixelShader) {
    // PNG Header
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // 8 bits per channel
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0; // deflate
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // non-interlaced
    const ihdrChunk = writePngChunk('IHDR', ihdr);

    // Raw image data with row filter byte 0
    const rawData = Buffer.alloc(height * (1 + width * 4));
    let offset = 0;

    for (let y = 0; y < height; y++) {
        rawData[offset++] = 0; // filter type None
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = pixelShader(x, y, width, height);
            rawData[offset++] = Math.min(255, Math.max(0, Math.round(r)));
            rawData[offset++] = Math.min(255, Math.max(0, Math.round(g)));
            rawData[offset++] = Math.min(255, Math.max(0, Math.round(b)));
            rawData[offset++] = Math.min(255, Math.max(0, Math.round(a)));
        }
    }

    const compressed = zlib.deflateSync(rawData, { level: 9 });
    const idatChunk = writePngChunk('IDAT', compressed);
    const iendChunk = writePngChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Favicon 32x32
console.log('Generating favicon-32x32.png...');
const favicon32 = createPng(32, 32, (x, y, w, h) => {
    const cx = w / 2, cy = h / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Rounded rectangle border
    const rx = Math.abs(x - cx);
    const ry = Math.abs(y - cy);
    if (rx > 14 || ry > 14) return [0, 0, 0, 0];

    // Background gradient: Emerald 10b981 to 059669
    const gradT = (x + y) / (w + h);
    let r = 16 + (5 - 16) * gradT;
    let g = 185 + (150 - 185) * gradT;
    let b = 129 + (105 - 129) * gradT;

    // Leaf shape in center
    const leafDx = dx + 1;
    const leafDy = dy + 1;
    if (leafDx * leafDx + leafDy * leafDy < 40 && (leafDx + leafDy > -4)) {
        // Crisp white leaf highlight
        return [255, 255, 255, 255];
    }

    return [r, g, b, 255];
});
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), favicon32);

// 2. Favicon 16x16
console.log('Generating favicon-16x16.png...');
const favicon16 = createPng(16, 16, (x, y, w, h) => {
    const cx = w / 2, cy = h / 2;
    const rx = Math.abs(x - cx);
    const ry = Math.abs(y - cy);
    if (rx > 7 || ry > 7) return [0, 0, 0, 0];

    if (Math.abs(x - y) <= 1 && x >= 4 && x <= 11) {
        return [255, 255, 255, 255];
    }
    return [16, 185, 129, 255];
});
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), favicon16);

// 3. Apple Touch Icon (180x180)
console.log('Generating apple-touch-icon.png...');
const appleIcon = createPng(180, 180, (x, y, w, h) => {
    const cx = w / 2, cy = h / 2;
    const rx = Math.abs(x - cx);
    const ry = Math.abs(y - cy);
    const cornerRadius = 36;
    if (rx > cx - 4 || ry > cy - 4) {
        const dx = Math.max(0, rx - (cx - cornerRadius));
        const dy = Math.max(0, ry - (cy - cornerRadius));
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) return [0, 0, 0, 0];
    }

    // Emerald gradient
    const t = (x + y) / (w + h);
    let r = 52 + (5 - 52) * t;
    let g = 211 + (150 - 211) * t;
    let b = 153 + (105 - 153) * t;

    // Center circle outline
    const distCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (distCenter >= 58 && distCenter <= 63) {
        return [255, 255, 255, 140];
    }

    // Center Leaf motif
    const ldx = (x - cx) / 45;
    const ldy = (y - cy) / 45;
    if (ldx * ldx + ldy * ldy < 0.65 && (ldx + ldy > -0.2)) {
        return [255, 255, 255, 255];
    }

    return [r, g, b, 255];
});
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// 4. Favicon.ico (standard Windows ICO file containing 16x16 and 32x32 PNG entries)
console.log('Generating favicon.ico...');
function createIco(images) {
    const count = images.length;
    let header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // icon type
    header.writeUInt16LE(count, 4); // count

    let dirOffset = 6;
    let dataOffset = 6 + count * 16;
    let entries = [];
    let imageBuffers = [];

    for (let img of images) {
        let entry = Buffer.alloc(16);
        entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
        entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
        entry.writeUInt8(0, 2); // palette
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // color planes
        entry.writeUInt16LE(32, 6); // bpp
        entry.writeUInt32LE(img.data.length, 8); // data size
        entry.writeUInt32LE(dataOffset, 12); // data offset

        entries.push(entry);
        imageBuffers.push(img.data);
        dataOffset += img.data.length;
    }

    return Buffer.concat([header, ...entries, ...imageBuffers]);
}

const faviconIco = createIco([
    { width: 16, height: 16, data: favicon16 },
    { width: 32, height: 32, data: favicon32 }
]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIco);

// 5. OpenGraph Social Preview Image (1200 x 630)
console.log('Generating og-image.png (1200x630)...');
const ogImage = createPng(1200, 630, (x, y, w, h) => {
    // Rich dark sleek slate background: #0b1329 with subtle emerald radial glow from bottom right
    const glowDx = x - 900;
    const glowDy = y - 450;
    const glowDist = Math.sqrt(glowDx * glowDx + glowDy * glowDy);
    const glow = Math.max(0, 1 - glowDist / 700);

    let r = 15 + glow * 10;
    let g = 23 + glow * 150;
    let b = 42 + glow * 100;

    // Top subtle bar
    if (y < 6) return [16, 185, 129, 255];

    // Left brand emblem badge (x: 120-220, y: 140-240)
    if (x >= 120 && x <= 220 && y >= 140 && y <= 240) {
        const bx = x - 170;
        const by = y - 190;
        if (Math.abs(bx) < 46 && Math.abs(by) < 46) {
            // Emblem gradient
            const gt = (bx + by + 92) / 184;
            let er = 16 + (5 - 16) * gt;
            let eg = 185 + (150 - 185) * gt;
            let eb = 129 + (105 - 129) * gt;
            // Center white leaf
            if (bx * bx + by * by < 450 && (bx + by > -5)) {
                return [255, 255, 255, 255];
            }
            return [er, eg, eb, 255];
        }
    }

    // Title text banner area (simulated stylized modern banner)
    // Horizontal accent stripe
    if (y >= 430 && y <= 433 && x >= 120 && x <= 600) {
        return [16, 185, 129, 255];
    }

    // Feature pill blocks at bottom (x: 120 to 1080, y: 470 to 540)
    const pills = [
        { x1: 120, x2: 380, label: 'Circles' },
        { x2: 670, x1: 410, label: 'Events' },
        { x1: 700, x2: 980, label: 'SkillShare' }
    ];
    for (let pill of pills) {
        if (x >= pill.x1 && x <= pill.x2 && y >= 470 && y <= 535) {
            const px = Math.min(x - pill.x1, pill.x2 - x);
            const py = Math.min(y - 470, 535 - y);
            if (px > 2 && py > 2) {
                // Frosted card styling
                return [30, 41, 59, 230];
            }
        }
    }

    return [r, g, b, 255];
});
fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogImage);

// 6. Twitter Preview Image (1200 x 600)
console.log('Generating twitter-image.png (1200x600)...');
const twitterImage = createPng(1200, 600, (x, y, w, h) => {
    const glowDx = x - 850;
    const glowDy = y - 400;
    const glowDist = Math.sqrt(glowDx * glowDx + glowDy * glowDy);
    const glow = Math.max(0, 1 - glowDist / 650);

    let r = 15 + glow * 12;
    let g = 23 + glow * 160;
    let b = 42 + glow * 110;

    if (y < 6) return [16, 185, 129, 255];

    // Left brand emblem
    if (x >= 120 && x <= 220 && y >= 130 && y <= 230) {
        const bx = x - 170;
        const by = y - 180;
        if (Math.abs(bx) < 46 && Math.abs(by) < 46) {
            const gt = (bx + by + 92) / 184;
            let er = 16 + (5 - 16) * gt;
            let eg = 185 + (150 - 185) * gt;
            let eb = 129 + (105 - 129) * gt;
            if (bx * bx + by * by < 450 && (bx + by > -5)) {
                return [255, 255, 255, 255];
            }
            return [er, eg, eb, 255];
        }
    }

    if (y >= 410 && y <= 413 && x >= 120 && x <= 600) {
        return [16, 185, 129, 255];
    }

    return [r, g, b, 255];
});
fs.writeFileSync(path.join(publicDir, 'twitter-image.png'), twitterImage);

console.log('All image assets successfully created in frontend/public!');
