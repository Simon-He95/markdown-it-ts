import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultMarkstreamVueDir = resolve(ROOT, '..', 'markstream-vue')
const markstreamVueDir = resolve(process.env.MARKSTREAM_VUE_DIR || defaultMarkstreamVueDir)
const parserDir = join(markstreamVueDir, 'packages', 'markdown-parser')
const parserPackageJsonPath = join(parserDir, 'package.json')
const parserDistDir = join(parserDir, 'dist')
const lockfilePath = join(markstreamVueDir, 'pnpm-lock.yaml')
const hasMarkstreamVueRepo = existsSync(join(markstreamVueDir, 'package.json')) && existsSync(join(parserDir, 'package.json'))
const forceRunMarkstreamVueIntegration = process.env.RUN_MARKSTREAM_VUE_INTEGRATION === '1'
const isCi = process.env.CI === 'true' || process.env.CI === '1'
const shouldRunMarkstreamVueIntegration = hasMarkstreamVueRepo && (!isCi || forceRunMarkstreamVueIntegration)
const shouldSnapshotParserDist = process.env.MARKSTREAM_VUE_BUILD_PARSER === '1'

const markstreamVueDescribe = shouldRunMarkstreamVueIntegration ? describe : describe.skip

function readDirectorySnapshot(dir: string, baseDir: string = dir, files: Record<string, string> = {}) {
  if (!existsSync(dir))
    return files

  for (const entry of readdirSync(dir)) {
    const absolutePath = join(dir, entry)
    const stats = statSync(absolutePath)
    if (stats.isDirectory()) {
      readDirectorySnapshot(absolutePath, baseDir, files)
      continue
    }

    const relativePath = absolutePath.slice(baseDir.length + 1)
    files[relativePath] = readFileSync(absolutePath, 'base64')
  }

  return files
}

markstreamVueDescribe('markstream-vue local-link integration', () => {
  it('links local markdown-it-ts and passes the full markstream-vue suite', { timeout: 5 * 60 * 1000 }, () => {
    const parserPackageJsonBefore = readFileSync(parserPackageJsonPath, 'utf8')
    const lockfileBefore = readFileSync(lockfilePath, 'utf8')
    const parserDistBefore = shouldSnapshotParserDist ? readDirectorySnapshot(parserDistDir) : null
    const result = spawnSync('node', ['scripts/test-markstream-vue-local.mjs'], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    })
    const parserPackageJsonAfter = readFileSync(parserPackageJsonPath, 'utf8')
    const lockfileAfter = readFileSync(lockfilePath, 'utf8')
    const parserDistAfter = shouldSnapshotParserDist ? readDirectorySnapshot(parserDistDir) : null

    expect(result.status).toBe(0)
    expect(parserPackageJsonAfter).toBe(parserPackageJsonBefore)
    expect(lockfileAfter).toBe(lockfileBefore)
    expect(parserDistAfter).toEqual(parserDistBefore)
  })
})
