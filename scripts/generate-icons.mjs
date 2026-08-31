import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const SVG_PATH = './public/favicon.svg'
const OUT_DIR = './public'

const svg = fs.readFileSync(SVG_PATH)

const pngSizes = [
  { name: 'favicon-16x16.png',   size: 16 },
  { name: 'favicon-32x32.png',   size: 32 },
  { name: 'favicon-96x96.png',   size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png',    size: 192 },
  { name: 'icon-512x512.png',    size: 512 },
]

console.log('Generating PNG icons...')
await Promise.all(
  pngSizes.map(({ name, size }) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, name))
      .then(() => console.log(`  ✓ ${name}`))
  )
)

console.log('Generating favicon.ico (16 + 32)...')
const png16 = fs.readFileSync(path.join(OUT_DIR, 'favicon-16x16.png'))
const png32 = fs.readFileSync(path.join(OUT_DIR, 'favicon-32x32.png'))
const ico = buildIco([png16, png32])
fs.writeFileSync(path.join(OUT_DIR, 'favicon.ico'), ico)
console.log('  ✓ favicon.ico')

/**
 * Build a minimal ICO file embedding PNG images.
 * Modern ICO format supports embedded PNGs directly.
 */
function buildIco(pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6
  const dirEntrySize = 16

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = ICO
  header.writeUInt16LE(count, 4)

  let dataOffset = headerSize + dirEntrySize * count

  const dirEntries = []
  for (const png of pngBuffers) {
    // PNG IHDR: width at byte 16, height at byte 20 (big-endian uint32)
    const w = png.readUInt32BE(16)
    const h = png.readUInt32BE(20)

    const entry = Buffer.alloc(dirEntrySize)
    entry[0] = w >= 256 ? 0 : w   // 0 means 256
    entry[1] = h >= 256 ? 0 : h
    entry[2] = 0                   // color count (0 = no palette)
    entry[3] = 0                   // reserved
    entry.writeUInt16LE(1, 4)      // planes
    entry.writeUInt16LE(32, 6)     // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(dataOffset, 12)

    dirEntries.push(entry)
    dataOffset += png.length
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers])
}
