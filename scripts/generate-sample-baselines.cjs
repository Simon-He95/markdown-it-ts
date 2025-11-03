// Generate baseline HTML for benchmark samples using the TypeScript src implementation
require('ts-node').register({ transpileOnly: true })
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
// samples were moved into markdown-it-ts/test/fixtures
const SAMPLES_DIR = path.join(__dirname, '..', 'test', 'fixtures')
const OUT_DIR = path.join(__dirname, '..', 'test', 'fixtures', 'rendered')

function ensureDir(dir) {
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir, { recursive: true })
}

ensureDir(OUT_DIR)

const parseMod = require(path.join(ROOT, 'src', 'parse'))
const renderMod = require(path.join(ROOT, 'src', 'render'))
const parse = parseMod.parse || parseMod.default || parseMod
const render = renderMod.render || renderMod.default || renderMod

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
