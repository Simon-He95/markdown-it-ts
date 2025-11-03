import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
// Use samples from parent repo's benchmark/samples
const SAMPLES_DIR = path.join(ROOT, '..', 'benchmark', 'samples')
const OUT_DIR = path.join(ROOT, 'test', 'fixtures', 'rendered')

function ensureDir(dir) {
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir, { recursive: true })
}

ensureDir(OUT_DIR)

// import parse/render from the src entry points using require hook via createRequire isn't available in ESM easily
// Use dynamic import of CommonJS transpiled sources by resolving via file URL to src/index files
const parseMod = await import(pathToFileURL(path.join(ROOT, 'src', 'parse', 'index.ts')).href).catch(() => null)
const renderMod = await import(pathToFileURL(path.join(ROOT, 'src', 'render', 'index.ts')).href).catch(() => null)

function pathToFileURL(p) {
  const url = new URL(`file://${p}`)
  return url
}

if (!parseMod || !renderMod) {
  // fallback: require compiled sources if present
  console.error('Could not import src entry points as ESM. Try running with node --experimental-specifier-resolution=node or run via ts-node. Aborting.')
  process.exit(1)
}

const { parse, parseInline } = parseMod
const { render } = renderMod

const samples = fs.readdirSync(SAMPLES_DIR).filter(f => fs.statSync(path.join(SAMPLES_DIR, f)).isFile())

for (const s of samples) {
  const src = fs.readFileSync(path.join(SAMPLES_DIR, s), 'utf8')
  let tokens
  try {
    tokens = parse(src)
  }
  catch (e) {
    console.warn(`Parse failed for ${s}: ${e}`)
    tokens = []
  }
  let html = ''
  try {
    html = render(tokens)
  }
  catch (e) {
    console.warn(`Render failed for ${s}: ${e}`)
    html = ''
  }
  const outPath = path.join(OUT_DIR, `${s}.html`)
  fs.writeFileSync(outPath, html, 'utf8')
  console.log('Wrote baseline for', s, '->', outPath)
}
