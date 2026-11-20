// 生成 uni-app 所需的 PNG 图标：底部 tabBar 图标（App 桌面图标见 icons/ 目录）。
// 仅依赖 Node 内置 zlib，直接编码 PNG，避免引入图形库。
// 用法：node tools/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const staticDir = join(root, 'src', 'static')
mkdirSync(join(staticDir, 'tab'), { recursive: true })

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8) // bit depth
  header.writeUInt8(6, 9) // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

// 把 16x16 的点阵（'.' 透明，'#' 着色）放大 scale 倍渲染为 PNG。
function renderGrid(grid, color, scale) {
  const [r, g, b] = hexToRgb(color)
  const size = grid.length * scale
  const pixels = Buffer.alloc(size * size * 4)
  grid.forEach((row, gy) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const offset = ((gy * scale + dy) * size + x * scale + dx) * 4
          pixels[offset] = r
          pixels[offset + 1] = g
          pixels[offset + 2] = b
          pixels[offset + 3] = 255
        }
      }
    }
  })
  return encodePng(size, size, pixels)
}

// ---------- tabBar 图标点阵（16x16） ----------
const HOME_GRID = [
  '................',
  '.......##.......',
  '......####......',
  '.....######.....',
  '....########....',
  '...##########...',
  '..############..',
  '.##############.',
  '...##########...',
  '...#........#...',
  '...#........#...',
  '...#...##...#...',
  '...#...##...#...',
  '...##########...',
  '................',
  '................',
]

const NOTES_GRID = [
  '................',
  '...##########...',
  '...#........#...',
  '...#........#...',
  '...#.######.#...',
  '...#........#...',
  '...#.######.#...',
  '...#........#...',
  '...#.#####..#...',
  '...#........#...',
  '...#.####...#...',
  '...#........#...',
  '...#........#...',
  '...##########...',
  '................',
  '................',
]

// 日记：一本带书签绳的本子。
const DIARY_GRID = [
  '................',
  '..###########...',
  '..#.........#...',
  '..#.........#...',
  '..#....###..#...',
  '..#....###..#...',
  '..#....###..#...',
  '..#....#.#..#...',
  '..#.........#...',
  '..#.#####...#...',
  '..#.........#...',
  '..#.####....#...',
  '..#.........#...',
  '..###########...',
  '................',
  '................',
]

// ---------- 应用图标（1024x1024，品牌色圆角方块 + 白色 P） ----------
function renderLogo(size) {
  const cells = 32
  const cell = size / cells
  const bg = hexToRgb('#21594d')
  const pixels = Buffer.alloc(size * size * 4)
  const radius = 6 // 圆角半径（单元格数）
  const glyph = [
    '................',
    '................',
    '.....######.....',
    '.....######.....',
    '.....#....#.....',
    '.....#....#.....',
    '.....#....#.....',
    '.....#....#.....',
    '.....######.....',
    '.....#..........',
    '.....#..........',
    '.....#..........',
    '.....#..........',
    '.....#..........',
    '................',
    '................',
  ]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cell)
      const cy = Math.floor(y / cell)
      // 圆角裁剪
      const corners = [
        [radius, radius],
        [cells - 1 - radius, radius],
        [radius, cells - 1 - radius],
        [cells - 1 - radius, cells - 1 - radius],
      ]
      let inside = true
      for (const [rx, ry] of corners) {
        const inCornerX = rx === radius ? cx < radius : cx > cells - 1 - radius
        const inCornerY = ry === radius ? cy < radius : cy > cells - 1 - radius
        if (inCornerX && inCornerY) {
          const dx = cx - rx
          const dy = cy - ry
          if (dx * dx + dy * dy > radius * radius) inside = false
        }
      }
      if (!inside) continue
      const gx = Math.floor(cx / 2)
      const gy = Math.floor(cy / 2)
      const isGlyph = glyph[gy][gx] === '#'
      const [r, g, b] = isGlyph ? [255, 255, 255] : bg
      const offset = (y * size + x) * 4
      pixels[offset] = r
      pixels[offset + 1] = g
      pixels[offset + 2] = b
      pixels[offset + 3] = 255
    }
  }
  return encodePng(size, size, pixels)
}

const INACTIVE = '#9aa3a0'
const ACTIVE = '#21594d'

writeFileSync(join(staticDir, 'tab', 'home.png'), renderGrid(HOME_GRID, INACTIVE, 5))
writeFileSync(join(staticDir, 'tab', 'home-active.png'), renderGrid(HOME_GRID, ACTIVE, 5))
writeFileSync(join(staticDir, 'tab', 'notes.png'), renderGrid(NOTES_GRID, INACTIVE, 5))
writeFileSync(join(staticDir, 'tab', 'notes-active.png'), renderGrid(NOTES_GRID, ACTIVE, 5))
writeFileSync(join(staticDir, 'tab', 'diary.png'), renderGrid(DIARY_GRID, INACTIVE, 5))
writeFileSync(join(staticDir, 'tab', 'diary-active.png'), renderGrid(DIARY_GRID, ACTIVE, 5))
// logo.png 由用户手动维护，这里不再覆盖，仅输出一份内置演示图标供参考。
writeFileSync(join(staticDir, 'logo-generated.png'), renderLogo(1024))
console.log('tabBar 图标已生成到 src/static/tab/（logo.png 不再被覆盖）')
