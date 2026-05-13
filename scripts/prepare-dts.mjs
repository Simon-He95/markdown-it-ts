import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const src = join(root, 'src')
const dist = join(root, 'dist')

mkdirSync(join(dist, 'types'), { recursive: true })
copyFileSync(join(src, 'types/index.d.ts'), join(dist, 'types/index.d.ts'))

function walk(dir) {
  const out = []

  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    const st = statSync(abs)

    if (st.isDirectory())
      out.push(...walk(abs))
    else
      out.push(abs)
  }

  return out
}

function resolveSpecifier(file, specifier) {
  if (!specifier.startsWith('.'))
    return specifier

  if (extname(specifier))
    return specifier

  const base = resolve(dirname(file), specifier)
  if (existsSync(`${base}.d.ts`))
    return `${specifier}.js`

  if (existsSync(join(base, 'index.d.ts')))
    return `${specifier}/index.js`

  return specifier
}

for (const file of walk(dist).filter(file => file.endsWith('.d.ts'))) {
  const original = readFileSync(file, 'utf8')
  const rewritten = original
    .replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${resolveSpecifier(file, specifier)}${suffix}`
    })
    .replace(/(import\(\s*['"])(\.[^'"]+)(['"]\s*\))/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${resolveSpecifier(file, specifier)}${suffix}`
    })

  if (rewritten !== original)
    writeFileSync(file, rewritten)
}

for (const file of walk(dist).filter(file => file.endsWith('.d.ts'))) {
  const text = readFileSync(file, 'utf8')
  const missing = Array.from(text.matchAll(/(?:from\s+['"]|import\(\s*['"])(\.[^'"]+)(?:['"])/g))
    .map(match => match[1])
    .filter((specifier) => {
      const base = resolve(dirname(file), specifier.replace(/\.js$/, ''))
      return !existsSync(`${base}.d.ts`) && !existsSync(join(base, 'index.d.ts'))
    })

  if (missing.length > 0) {
    const rel = relative(root, file)
    throw new Error(`Unresolved declaration import in ${rel}: ${missing.join(', ')}`)
  }
}
