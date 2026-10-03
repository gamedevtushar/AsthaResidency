// Draws the app icons for every colour theme (same artwork as the logo) and writes one web manifest per theme.
// Run after changing src/palettes.js:  node scripts/make-icons.mjs
// Pure Node: signed-distance shapes with 4×4 supersampling, saved as PNG.
import zlib from 'node:zlib'
import fs from 'node:fs'
import { PALETTES } from '../src/palettes.js'

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const WHITE = [255, 255, 255]

const seg = (px, py, ax, ay, bx, by) => {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
  return Math.hypot(pax - bax * h, pay - bay * h)
}
const roundRect = (px, py, r) => {
  const qx = Math.abs(px - 32) - (32 - r), qy = Math.abs(py - 32) - (32 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

function render(pal, size, rx, k = 1) {
  const C1 = hex(pal.logo[0]), C2 = hex(pal.logo[1]), DOT = hex(pal.dot)
  const colorAt = (u0, v0) => {
    // k < 1 shrinks the artwork toward the centre (maskable icons need a safe margin)
    const u = 32 + (u0 - 32) / k, v = 32 + (v0 - 32) / k
    if (rx > 0 && roundRect(u0, v0, rx) > 0) return null
    if (Math.hypot(u - 32, v - 30.5) <= 3.4) return DOT
    if (seg(u, v, 13, 51, 32, 13) <= 3.25 || seg(u, v, 32, 13, 51, 51) <= 3.25 || seg(u, v, 18.75, 40.5, 45.25, 40.5) <= 2.5) return WHITE
    const t = Math.max(0, Math.min(1, (u0 + v0) / 128))
    return C1.map((c, i) => c + (C2[i] - c) * t)
  }
  const S = 4
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, n = 0
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const c = colorAt(((x + (i + 0.5) / S) * 64) / size, ((y + (j + 0.5) / S) * 64) / size)
        if (c) { r += c[0]; g += c[1]; b += c[2]; n++ }
      }
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = n ? Math.round(r / n) : 0
      raw[o + 1] = n ? Math.round(g / n) : 0
      raw[o + 2] = n ? Math.round(b / n) : 0
      raw[o + 3] = Math.round((n / (S * S)) * 255)
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ])
}

fs.mkdirSync('public/icons', { recursive: true })
for (const pal of PALETTES) {
  const files = [
    [`${pal.id}-180.png`, 180, 0], // iPhone rounds the corners itself → full square
    [`${pal.id}-192.png`, 192, 15],
    [`${pal.id}-512.png`, 512, 15],
    [`${pal.id}-maskable.png`, 512, 0, 0.78], // Android crops to a circle → artwork inside the safe zone
  ]
  for (const [name, size, rx, k] of files) fs.writeFileSync(`public/icons/${name}`, render(pal, size, rx, k))
  fs.writeFileSync(`public/icons/${pal.id}.webmanifest`, JSON.stringify({
    id: '../',
    name: 'Astha Residency – Maintenance',
    short_name: 'Astha',
    description: 'Building maintenance, bills and reports for Astha Residency',
    start_url: '../',
    scope: '../',
    display: 'standalone',
    background_color: pal.light.bg,
    theme_color: pal.dark.bar,
    icons: [
      { src: `${pal.id}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${pal.id}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${pal.id}-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2) + '\n')
  console.log('icons:', pal.id)
}
