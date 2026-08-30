import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

async function loadSharp() {
  try {
    return (await import('sharp')).default
  } catch {
    const pnpm = join(root, 'node_modules/.pnpm')
    const dir = readdirSync(pnpm).find((name) => name.startsWith('sharp@'))
    if (!dir) {
      throw new Error('sharp is not installed; run pnpm install')
    }
    const { default: sharp } = await import(
      pathToFileURL(join(pnpm, dir, 'node_modules/sharp/dist/index.mjs')).href
    )
    return sharp
  }
}

async function ensureFont(fileName, url, fallbacks = []) {
  for (const candidate of [join(tmpdir(), 'og-fonts', fileName), ...fallbacks]) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  const dest = join(tmpdir(), 'og-fonts', fileName)
  mkdirSync(dirname(dest), { recursive: true })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`failed to download ${fileName}: ${response.status}`)
  }
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()))
  return dest
}

function installFont(filePath) {
  const dest = join(homedir(), '.local/share/fonts', filePath.split('/').at(-1))
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(filePath, dest)
  spawnSync('fc-cache', ['-f', dirname(dest)], { stdio: 'ignore' })
}

function encodeIco(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const chunks = [header]
  let offset = header.length
  images.forEach((image, index) => {
    const entry = 6 + index * 16
    header.writeUInt8(image.width >= 256 ? 0 : image.width, entry)
    header.writeUInt8(image.height >= 256 ? 0 : image.height, entry + 1)
    header.writeUInt8(0, entry + 2)
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(image.data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    chunks.push(image.data)
    offset += image.data.length
  })
  return Buffer.concat(chunks)
}

const ay = `
  <path fill="#e3b23c" fill-rule="evenodd" d="M10 6.4 15.15 25h-2.55l-1.05-3.95h-3.1L7.4 25H4.85L10 6.4Zm-1.05 11.7h2.1L10 13.55l-1.05 4.55Z"/>
  <path fill="#e3b23c" d="M16.35 6.4h2.7L21 13.2 23 6.4h2.65L22.2 16.15V25h-2.45v-8.85L16.35 6.4Z"/>
`

function squareIconSvg(size, { pad = 0, border = true } = {}) {
  const inset = 1.25 + pad
  const scale = (32 - pad * 2) / 32
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0c0b09"/>
  ${border ? `<rect x="${inset}" y="${inset}" width="${32 - inset * 2}" height="${32 - inset * 2}" fill="none" stroke="#e3b23c" stroke-opacity="0.45" stroke-width="${1.25 / scale}"/>` : ''}
  <g transform="translate(${pad} ${pad}) scale(${scale})">${ay}</g>
</svg>`
}

const [sharp, displayPath] = await Promise.all([
  loadSharp(),
  ensureFont(
    'ArchivoBlack-Regular.ttf',
    'https://github.com/google/fonts/raw/refs/heads/main/ofl/archivoblack/ArchivoBlack-Regular.ttf',
  ),
])

installFont(displayPath)

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="goldWash" cx="50%" cy="18%" r="62%">
      <stop offset="0%" stop-color="#e3b23c" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#0c0b09" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="adamGlow" cx="24%" cy="46%" r="34%">
      <stop offset="0%" stop-color="#7eb6ff" stop-opacity="0.22"/>
      <stop offset="75%" stop-color="#0c0b09" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="yagizGlow" cx="76%" cy="46%" r="34%">
      <stop offset="0%" stop-color="#ff7a55" stop-opacity="0.2"/>
      <stop offset="75%" stop-color="#0c0b09" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="#0c0b09"/>
  <rect width="1200" height="630" fill="url(#goldWash)"/>
  <rect width="1200" height="630" fill="url(#adamGlow)"/>
  <rect width="1200" height="630" fill="url(#yagizGlow)"/>
  <rect x="64" y="56" width="1072" height="518" fill="none" stroke="#e3b23c" stroke-opacity="0.28" stroke-width="1.5"/>

  <text x="300" y="322" text-anchor="middle" fill="#7eb6ff" font-family="Archivo Black" font-size="118">ADAM</text>
  <text x="900" y="322" text-anchor="middle" fill="#ff7a55" font-family="Archivo Black" font-size="118">YAGIZ</text>

  <circle cx="600" cy="274" r="42" fill="#1a160e" stroke="#e3b23c" stroke-width="2"/>
  <text x="600" y="288" text-anchor="middle" fill="#e3b23c" font-family="Archivo Black" font-size="28">VS</text>

  <text x="600" y="478" text-anchor="middle" fill="#f3d78a" font-family="Archivo Black" font-size="42" letter-spacing="4">FITNESS CHALLENGE</text>
</svg>`

async function writePng(svg, file, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, file))
}

const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'))
const icoSizes = [16, 32, 48]
const icoImages = []
for (const size of icoSizes) {
  const data = await sharp(faviconSvg).resize(size, size).png({ compressionLevel: 9 }).toBuffer()
  icoImages.push({ width: size, height: size, data })
}

await Promise.all([
  sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(join(publicDir, 'og.png')),
  writePng(faviconSvg, 'favicon-16x16.png', 16),
  writePng(faviconSvg, 'favicon-32x32.png', 32),
  writePng(squareIconSvg(180), 'apple-touch-icon.png', 180),
  writePng(squareIconSvg(192), 'android-chrome-192x192.png', 192),
  writePng(squareIconSvg(512, { pad: 3.2 }), 'android-chrome-512x512.png', 512),
  writePng(squareIconSvg(150), 'mstile-150x150.png', 150),
])

writeFileSync(join(publicDir, 'favicon.ico'), encodeIco(icoImages))

console.log(
  'wrote public/og.png, favicon.ico, PNG icons, apple-touch-icon.png, android-chrome-*.png, mstile-150x150.png',
)
