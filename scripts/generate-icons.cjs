// Hand-rolled PNG writer so icon generation needs no native deps (no sharp/canvas).
// Draws a simple orbit mark: a violet disc with a lighter ring and a bright dot,
// matching the app's dashboard accent (violet).
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function writePng(filePath, size, draw) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdr = chunk('IHDR', ihdrData)

  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0 // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size)
      const off = rowStart + 1 + x * 4
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }))
  const iend = chunk('IEND', Buffer.alloc(0))
  fs.writeFileSync(filePath, Buffer.concat([sig, ihdr, idat, iend]))
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const BG = hexToRgb('#0b0b10')
const RING = hexToRgb('#a78bfa') // violet-400, the dashboard accent
const CORE = hexToRgb('#7c5cff') // violet-600ish
const DOT = hexToRgb('#e9e4ff')

function orbitPixel(x, y, size) {
  const cx = size / 2
  const cy = size / 2
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const r = size * 0.5

  // Rounded-square background so it reads well as a maskable icon.
  const pad = size * 0.06
  const radius = size * 0.22
  const inBody = (() => {
    const bx = Math.max(pad - x, x - (size - pad), 0)
    const by = Math.max(pad - y, y - (size - pad), 0)
    if (bx <= 0 && by <= 0) return true
    return Math.sqrt(bx * bx + by * by) <= radius
  })()
  if (!inBody) return [0, 0, 0, 0]

  // Core disc
  if (dist < r * 0.34) return [...CORE, 255]
  // Orbit ring
  const ringR = r * 0.62
  const ringW = size * 0.045
  if (Math.abs(dist - ringR) < ringW) return [...RING, 255]
  // Orbiting dot, fixed at top of the ring
  const dotX = cx
  const dotY = cy - ringR
  const dDist = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2)
  if (dDist < size * 0.055) return [...DOT, 255]

  return [...BG, 255]
}

const outDir = path.resolve(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })
writePng(path.join(outDir, 'icon-192.png'), 192, orbitPixel)
writePng(path.join(outDir, 'icon-512.png'), 512, orbitPixel)
console.log('Wrote icon-192.png and icon-512.png')
