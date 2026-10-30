// Compiles and runs every fckt example in the docs, and checks what it prints.
//
//   node scripts/check-examples.mjs [page.md ...]
//
// Each block is turned into a program as docs/.vitepress/examples.js says. A line ending in
// `// result` must print that result, and `// prints ...` what it prints. A block followed straight
// away by a plain block that starts with `error:` must fail to compile with that message. A block
// that declares main runs as it is, and if a plain block follows it straight away, that's its output.
//
// The words after `fckt` on the fence change this:
//   compiles    compile it but don't run it (it reads files, waits for input, ...)
//   no-check    leave it alone (a fragment that can't stand on its own)
//
// Imports the compiler suggests are added, so examples can leave them out.
//
// The compiler is FCKT, or fckt on the PATH. Pages whose examples are kiln builds (the kiln and
// testing pages, docs/libraries and docs/examples) aren't checked yet.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir, cpus } from 'node:os'
import { blocksOf, contextAfter, isMain, matches, programOf, resultsOf, suggestedImports } from '../docs/.vitepress/examples.js'

// Runs a command with nothing on its standard input, so a program that reads it sees the end.
function run(command, args, { cwd, timeout = 60_000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout.on('data', d => (stdout += d))
    child.stderr.on('data', d => (stderr += d))
    const timer = setTimeout(() => child.kill(), timeout)
    child.on('error', reject)
    child.on('close', code => {
      clearTimeout(timer)
      code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error(`exit ${code}`), { stdout, stderr }))
    })
  })
}
const FCKT = process.env.FCKT ?? 'fckt'
const DOCS = new URL('../docs/', import.meta.url).pathname
const WORK = join(tmpdir(), 'fckt-docs-check')
const SKIPPED_DIRS = ['libraries', 'examples', '.vitepress', 'public']
// Pages whose examples are kiln builds and need libraries from a kiln repository.
const KILN_PAGES = ['kiln.md', 'testing.md']

const pages = process.argv.slice(2).length ? process.argv.slice(2) : walk(DOCS)

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return SKIPPED_DIRS.includes(name) ? [] : walk(path)
    return name.endsWith('.md') && !KILN_PAGES.includes(name) ? [path] : []
  })
}

async function check({ page, block, code, context, id }) {
  const problems = []
  const where = `${relative(DOCS, page)}:${block.line}`
  const dir = join(WORK, id)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  let { source, expected } = programOf(code, context)
  const error = block.after?.startsWith('error:') ? block.after.trim() : null
  const wanted = error?.split('\n')[0].replace(/^error: /, '')
  // Examples leave out imports to stay short, so the ones the compiler suggests are added.
  for (let attempt = 0; ; attempt++) {
    writeFileSync(join(dir, 'main.fk'), source)
    try {
      await run(FCKT, ['main.fk', '-o', 'main.ml'], { cwd: dir })
      if (error) return [`${where}: should fail with\n    ${error}\n  but it compiled`]
      break
    } catch (e) {
      const message = (e.stderr || e.message).trim()
      if (error && message.includes(wanted)) return []
      const missing = suggestedImports(message)
      if (missing.length && attempt < 3) { source = missing.join('\n') + '\n' + source; continue }
      if (error) return [`${where}: expected the error\n    ${wanted}\n  but got\n    ${message.split('\n').slice(0, 3).join('\n    ')}`]
      return [`${where}: doesn't compile\n    ${message.split('\n').slice(0, 4).join('\n    ')}`]
    }
  }
  if (block.words.includes('compiles')) return []
  let stdout = ''
  try {
    const libraries = ['unix', 'str'].flatMap(l => ['-I', `+${l}`, `${l}.cma`])
    ;({ stdout } = await run('ocaml', [...libraries, 'main.ml'], { cwd: dir, timeout: 30_000 }))
  } catch (e) {
    return [`${where}: failed when run\n    ${(e.stderr || e.message).trim().split('\n').slice(0, 3).join('\n    ')}`]
  }
  if (expected.length) {
    const got = resultsOf(stdout).results
    expected.forEach((want, i) => {
      if (!matches(want, got[i])) problems.push(`${where}: expected ${JSON.stringify(want)} but got ${JSON.stringify(got[i])}`)
    })
  } else if (block.after !== null && !error && !block.after.startsWith('$') && isMain(code)) {
    const want = block.after.trimEnd(), got = stdout.trimEnd()
    if (want !== got) problems.push(`${where}: printed\n    ${got.split('\n').join('\n    ')}\n  but the page shows\n    ${want.split('\n').join('\n    ')}`)
  }
  return problems
}

// Each page's examples are checked in order, so an example can use what the ones before it
// declared. Pages are checked side by side.
async function checkPage(page) {
  const problems = []
  let context = [], checked = 0, skipped = 0
  const blocks = blocksOf(readFileSync(page, 'utf8'))
  for (const [index, block] of blocks.entries()) {
    if (block.lang !== 'fckt') continue
    if (block.words.includes('no-check')) { skipped++; continue }
    const code = block.code
    checked++
    const found = await check({ page, block, code, context, id: `${relative(DOCS, page).replace(/\W/g, '_')}_${index}` })
    problems.push(...found)
    // A wrong result still compiled, so later examples can use what it declares.
    if (found.some(problem => !/: expected "/.test(problem))) continue
    context = contextAfter(context, block.code, block.after?.startsWith('error:'))
  }
  return { problems, checked, skipped }
}

const queue = [...pages]
const results = []
await Promise.all(Array.from({ length: Math.max(2, cpus().length) }, async () => {
  for (let page; (page = queue.shift()); ) results.push(await checkPage(page))
}))
const problems = results.flatMap(r => r.problems)
const checked = results.reduce((n, r) => n + r.checked, 0)
const skipped = results.reduce((n, r) => n + r.skipped, 0)

problems.sort().forEach(p => console.log(p + '\n'))
console.log(`${checked} examples checked, ${skipped} not checked, ${problems.length} problems`)
process.exit(problems.length ? 1 : 0)
