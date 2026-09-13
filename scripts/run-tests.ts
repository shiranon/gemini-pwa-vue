#!/usr/bin/env bun
/**
 * テストファイルを1つずつ別プロセスで実行する isolated runner。
 *
 * bun の `mock.module` はプロセス全体に固着し、ファイル間で漏れる
 * (`mock.restore()` でも afterAll の再モックでも戻らない)。
 * 共有モジュール(`~/stores/settings` 等)をモックするファイルと、その実体を
 * 要求するファイルは同一プロセスでは両立できないため、ファイル毎に
 * 独立プロセスで実行して分離する。各ファイルは単独では正しく pass する。
 *
 * 追加の引数はそのまま全プロセスへ渡す (例: `bun run test --coverage`)。
 * 引数で spec ファイルを指定した場合はそれらのみを対象にする。
 */
import { Glob } from 'bun'

const CONCURRENCY = 4

const passthroughArgs = Bun.argv.slice(2)
const explicitFiles = passthroughArgs.filter((arg) => arg.endsWith('.spec.ts'))
const forwardedFlags = passthroughArgs.filter((arg) => !arg.endsWith('.spec.ts'))

const files: string[] = []
if (explicitFiles.length > 0) {
  files.push(...explicitFiles)
} else {
  const glob = new Glob('tests/**/*.spec.ts')
  for await (const file of glob.scan('.')) {
    files.push(file)
  }
}
files.sort()

if (files.length === 0) {
  console.log('No test files found.')
  process.exit(0)
}

type FileResult = {
  file: string
  code: number
  output: string
}

const results: FileResult[] = []
let cursor = 0

const runFile = async (file: string): Promise<FileResult> => {
  const proc = Bun.spawn(['bun', 'test', file, ...forwardedFlags], {
    env: { ...process.env, TZ: 'Asia/Tokyo' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  return { file, code, output: `${stdout}${stderr}` }
}

const worker = async () => {
  while (cursor < files.length) {
    const file = files[cursor++]
    if (!file) break
    const result = await runFile(file)
    results.push(result)
    const status = result.code === 0 ? '[PASS]' : '[FAIL]'
    console.log(`${status} ${file}`)
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker))

const failures = results.filter((result) => result.code !== 0)

if (failures.length > 0) {
  console.log('\n========== FAILURE OUTPUT ==========')
  for (const failure of failures) {
    console.log(`\n----- ${failure.file} -----`)
    console.log(failure.output.trimEnd())
  }
}

console.log(`\n${results.length - failures.length}/${results.length} test files passed`)
if (failures.length > 0) {
  console.log('Failed files:')
  for (const failure of failures) {
    console.log(`  ${failure.file}`)
  }
  process.exit(1)
}
