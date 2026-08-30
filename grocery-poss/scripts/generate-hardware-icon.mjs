import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(rootDir, 'resources', 'hardware_icon.png')
const buildDir = join(rootDir, 'build')
const sourcePng = readFileSync(sourcePath)
const sourceImage = decodePng(sourcePng)

mkdirSync(buildDir, { recursive: true })
writeFileSync(join(buildDir, 'icon.png'), sourcePng)
writeFileSync(join(buildDir, 'icon.ico'), createIco(sourceImage, [16, 24, 32, 48, 64, 128, 256]))
writeFileSync(join(buildDir, 'icon.icns'), createIcns(sourcePng))

const hash = createHash('sha256').update(sourcePng).digest('hex')
console.log(`Generated app icons from resources/hardware_icon.png (${hash})`)

function decodePng(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('hardware_icon.png is not a PNG file.')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error('hardware_icon.png must be a non-interlaced 8-bit RGBA PNG.')
  }

  const bytesPerPixel = 4
  const stride = width * bytesPerPixel
  const raw = inflateSync(Buffer.concat(idatChunks))
  const pixels = Buffer.alloc(width * height * bytesPerPixel)
  let rawOffset = 0
  let previousRow = Buffer.alloc(stride)

  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset]
    rawOffset += 1
    const row = Buffer.alloc(stride)

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0
      const up = previousRow[x] ?? 0
      const upLeft = x >= bytesPerPixel ? previousRow[x - bytesPerPixel] : 0
      const value = raw[rawOffset]
      rawOffset += 1

      row[x] = (value + pngFilterValue(filterType, left, up, upLeft)) & 255
    }

    row.copy(pixels, y * stride)
    previousRow = row
  }

  return { width, height, pixels }
}

function pngFilterValue(filterType, left, up, upLeft) {
  if (filterType === 0) return 0
  if (filterType === 1) return left
  if (filterType === 2) return up
  if (filterType === 3) return Math.floor((left + up) / 2)
  if (filterType === 4) return paeth(left, up, upLeft)
  throw new Error(`Unsupported PNG filter type: ${filterType}`)
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft
  const leftDistance = Math.abs(estimate - left)
  const upDistance = Math.abs(estimate - up)
  const upLeftDistance = Math.abs(estimate - upLeft)

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left
  if (upDistance <= upLeftDistance) return up
  return upLeft
}

function createIco(image, sizes) {
  const entries = sizes.map((size) => ({
    size,
    data: createDib(image, size)
  }))
  const headerSize = 6 + entries.length * 16
  const header = Buffer.alloc(headerSize)

  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  let imageOffset = headerSize
  entries.forEach((entry, index) => {
    const entryOffset = 6 + index * 16
    const sizeByte = entry.size === 256 ? 0 : entry.size

    header[entryOffset] = sizeByte
    header[entryOffset + 1] = sizeByte
    header[entryOffset + 2] = 0
    header[entryOffset + 3] = 0
    header.writeUInt16LE(1, entryOffset + 4)
    header.writeUInt16LE(32, entryOffset + 6)
    header.writeUInt32LE(entry.data.length, entryOffset + 8)
    header.writeUInt32LE(imageOffset, entryOffset + 12)
    imageOffset += entry.data.length
  })

  return Buffer.concat([header, ...entries.map((entry) => entry.data)])
}

function createDib(image, size) {
  const rgba = resizeBilinear(image, size, size)
  const pixelBytes = size * size * 4
  const maskRowBytes = Math.ceil(size / 32) * 4
  const maskBytes = maskRowBytes * size
  const dib = Buffer.alloc(40 + pixelBytes + maskBytes)

  dib.writeUInt32LE(40, 0)
  dib.writeInt32LE(size, 4)
  dib.writeInt32LE(size * 2, 8)
  dib.writeUInt16LE(1, 12)
  dib.writeUInt16LE(32, 14)
  dib.writeUInt32LE(0, 16)
  dib.writeUInt32LE(pixelBytes + maskBytes, 20)
  dib.writeInt32LE(0, 24)
  dib.writeInt32LE(0, 28)
  dib.writeUInt32LE(0, 32)
  dib.writeUInt32LE(0, 36)

  let outputOffset = 40
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const inputOffset = (y * size + x) * 4
      dib[outputOffset] = rgba[inputOffset + 2]
      dib[outputOffset + 1] = rgba[inputOffset + 1]
      dib[outputOffset + 2] = rgba[inputOffset]
      dib[outputOffset + 3] = rgba[inputOffset + 3]
      outputOffset += 4
    }
  }

  return dib
}

function resizeBilinear(image, targetWidth, targetHeight) {
  const output = Buffer.alloc(targetWidth * targetHeight * 4)
  const xScale = image.width / targetWidth
  const yScale = image.height / targetHeight

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.max(0, Math.min(image.height - 1, (y + 0.5) * yScale - 0.5))
    const y0 = Math.floor(sourceY)
    const y1 = Math.min(image.height - 1, y0 + 1)
    const yWeight = sourceY - y0

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.max(0, Math.min(image.width - 1, (x + 0.5) * xScale - 0.5))
      const x0 = Math.floor(sourceX)
      const x1 = Math.min(image.width - 1, x0 + 1)
      const xWeight = sourceX - x0
      const outputOffset = (y * targetWidth + x) * 4

      for (let channel = 0; channel < 4; channel += 1) {
        const top =
          image.pixels[(y0 * image.width + x0) * 4 + channel] * (1 - xWeight) +
          image.pixels[(y0 * image.width + x1) * 4 + channel] * xWeight
        const bottom =
          image.pixels[(y1 * image.width + x0) * 4 + channel] * (1 - xWeight) +
          image.pixels[(y1 * image.width + x1) * 4 + channel] * xWeight

        output[outputOffset + channel] = Math.round(top * (1 - yWeight) + bottom * yWeight)
      }
    }
  }

  return output
}

function createIcns(png) {
  const header = Buffer.alloc(16)
  header.write('icns', 0, 'ascii')
  header.writeUInt32BE(16 + png.length, 4)
  header.write('ic08', 8, 'ascii')
  header.writeUInt32BE(8 + png.length, 12)
  return Buffer.concat([header, png])
}
