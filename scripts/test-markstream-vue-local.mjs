import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultMarkstreamVueDir = resolve(ROOT, '..', 'markstream-vue')
const markstreamVueDir = resolve(process.env.MARKSTREAM_VUE_DIR || defaultMarkstreamVueDir)
const parserDir = join(markstreamVueDir, 'packages', 'markdown-parser')
const parserPackageJsonPath = join(parserDir, 'package.json')
const parserDistDir = join(parserDir, 'dist')
const lockfilePath = join(markstreamVueDir, 'pnpm-lock.yaml')
const buildParserPackage = process.env.MARKSTREAM_VUE_BUILD_PARSER === '1'

function fail(message) {
  console.error(`[markstream-vue-local] ${message}`)
  process.exit(1)
}

function run(command, args, cwd) {
  console.log(`[markstream-vue-local] ${cwd}$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    const error = new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`)
    error.exitCode = result.status ?? 1
    throw error
  }
}

function runCorepackPnpm(args, cwd) {
  run('corepack', ['pnpm', ...args], cwd)
}

function collectDirectorySnapshot(dir, baseDir = dir, files = new Map()) {
  if (!existsSync(dir))
    return files

  for (const entry of readdirSync(dir)) {
    const absolutePath = join(dir, entry)
    const stats = statSync(absolutePath)
    if (stats.isDirectory()) {
      collectDirectorySnapshot(absolutePath, baseDir, files)
      continue
    }
    files.set(relative(baseDir, absolutePath), readFileSync(absolutePath))
  }

  return files
}

if (!existsSync(join(markstreamVueDir, 'package.json')))
  fail(`markstream-vue repo not found at ${markstreamVueDir}`)

if (!existsSync(parserPackageJsonPath))
  fail(`markstream-vue markdown-parser package not found at ${parserDir}`)

if (!existsSync(lockfilePath))
  fail(`markstream-vue lockfile not found at ${lockfilePath}`)

const linkTarget = relative(parserDir, ROOT).split(sep).join('/')
const testArgs = process.argv.slice(2)
const originalParserPackageJson = readFileSync(parserPackageJsonPath, 'utf8')
const originalLockfile = readFileSync(lockfilePath, 'utf8')
const originalParserDist = buildParserPackage ? collectDirectorySnapshot(parserDistDir) : new Map()
let touchedMarkstreamVue = false
let exitCode = 0
let isRestoring = false
let hasRestored = false

function restoreTrackedFiles() {
  writeFileSync(parserPackageJsonPath, originalParserPackageJson)
  writeFileSync(lockfilePath, originalLockfile)

  if (buildParserPackage) {
    rmSync(parserDistDir, { recursive: true, force: true })
    if (originalParserDist.size > 0) {
      for (const [relativePath, content] of originalParserDist) {
        const outputPath = join(parserDistDir, relativePath)
        mkdirSync(dirname(outputPath), { recursive: true })
        writeFileSync(outputPath, content)
      }
    }
  }
}

function restoreMarkstreamVue({ reinstall = true } = {}) {
  if (!touchedMarkstreamVue || hasRestored || isRestoring)
    return

  isRestoring = true
  console.log('[markstream-vue-local] restoring markstream-vue dependency files')

  try {
    restoreTrackedFiles()
    if (reinstall)
      runCorepackPnpm(['install', '--frozen-lockfile'], markstreamVueDir)
    hasRestored = true
  } finally {
    isRestoring = false
  }
}

function emergencyExit(code, message, error) {
  if (message)
    console.error(`[markstream-vue-local] ${message}`)
  if (error)
    console.error(error)

  try {
    restoreMarkstreamVue({ reinstall: false })
  } catch (restoreError) {
    console.error(`[markstream-vue-local] failed emergency restore: ${restoreError.message}`)
  }

  process.exit(code)
}

console.log(`[markstream-vue-local] using markdown-it-ts from ${ROOT}`)
console.log(`[markstream-vue-local] linking into ${parserDir} as link:${linkTarget}`)
if (buildParserPackage)
  console.log('[markstream-vue-local] MARKSTREAM_VUE_BUILD_PARSER=1, will rebuild stream-markdown-parser dist during validation')

process.once('SIGINT', () => emergencyExit(130, 'received SIGINT, restoring markstream-vue files before exit'))
process.once('SIGTERM', () => emergencyExit(143, 'received SIGTERM, restoring markstream-vue files before exit'))
process.once('SIGHUP', () => emergencyExit(129, 'received SIGHUP, restoring markstream-vue files before exit'))
process.once('uncaughtException', error => emergencyExit(1, 'uncaught exception while validating markstream-vue', error))
process.once('unhandledRejection', error => emergencyExit(1, 'unhandled rejection while validating markstream-vue', error))
process.once('exit', () => {
  if (!touchedMarkstreamVue || hasRestored)
    return

  try {
    restoreTrackedFiles()
  } catch {
    // Best effort only: exit handlers cannot recover from every termination mode.
  }
})

try {
  run('pnpm', ['build'], ROOT)
  touchedMarkstreamVue = true
  runCorepackPnpm(['--dir', parserDir, 'add', `markdown-it-ts@link:${linkTarget}`], markstreamVueDir)
  if (buildParserPackage)
    runCorepackPnpm(['--dir', parserDir, 'build'], markstreamVueDir)
  runCorepackPnpm(['--dir', markstreamVueDir, 'test', '--run', ...testArgs], markstreamVueDir)
} catch (error) {
  exitCode = error.exitCode ?? 1
  console.error(`[markstream-vue-local] ${error.message}`)
} finally {
  if (touchedMarkstreamVue) {
    try {
      restoreMarkstreamVue()
    } catch (error) {
      exitCode = error.exitCode ?? 1
      console.error(`[markstream-vue-local] failed to restore markstream-vue: ${error.message}`)
    }
  }
}

if (exitCode !== 0)
  process.exit(exitCode)
