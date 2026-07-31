#!/usr/bin/env node
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

const NAVY_TOP = [12, 48, 82]
const NAVY_BOTTOM = [4, 16, 30]
const GOLD = [230, 183, 92]

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(size, rgba) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const ROOF = { apexY: 0.18, baseY: 0.62, leftX: 0.27, rightX: 0.73 }
const BAR = { x0: 0.29, y0: 0.71, x1: 0.71, y1: 0.79 }

const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by)
  const d2 = sign(px, py, bx, by, cx, cy)
  const d3 = sign(px, py, cx, cy, ax, ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const ss = 3
  const S = size
  const { apexY, baseY, leftX, rightX } = ROOF
  const { x0, y0, x1, y1 } = BAR
  const apexX = (leftX + rightX) / 2
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1)
    const navy = [
      NAVY_TOP[0] + (NAVY_BOTTOM[0] - NAVY_TOP[0]) * t,
      NAVY_TOP[1] + (NAVY_BOTTOM[1] - NAVY_TOP[1]) * t,
      NAVY_TOP[2] + (NAVY_BOTTOM[2] - NAVY_TOP[2]) * t,
    ]
    for (let x = 0; x < S; x++) {
      let gold = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x + (sx + 0.5) / ss) / S
          const py = (y + (sy + 0.5) / ss) / S
          const inRoof = inTriangle(px, py, leftX, baseY, rightX, baseY, apexX, apexY)
          const inBar = px >= x0 && px <= x1 && py >= y0 && py <= y1
          if (inRoof || inBar) gold++
        }
      }
      const a = gold / (ss * ss)
      const i = (y * S + x) * 4
      rgba[i] = Math.round(navy[0] + (GOLD[0] - navy[0]) * a)
      rgba[i + 1] = Math.round(navy[1] + (GOLD[1] - navy[1]) * a)
      rgba[i + 2] = Math.round(navy[2] + (GOLD[2] - navy[2]) * a)
      rgba[i + 3] = 255
    }
  }
  return rgba
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `pwa-${size}x${size}.png`), encodePNG(size, drawIcon(size)))
}
writeFileSync(join(outDir, 'apple-touch-icon.png'), encodePNG(180, drawIcon(180)))
console.log('icons written to', outDir)
