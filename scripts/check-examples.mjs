// Compiles and runs every fckt example in the docs, and checks what it prints.
//
//   node scripts/check-examples.mjs [page.md ...]
//
// A block is turned into a program: declarations stay at the top level, everything else runs in
// main. A line ending in `// result` must print that result (or something it starts with, followed
// by a comma or a space, so `// -7, the same as ...` works). A block followed straight away by a
// plain block that starts with `error:` must fail to compile with that message. A block that
// declares main is run as it is, and if a plain block follows it straight away, that's its output.
//
// The words after `fckt` on the fence change this:
//   compiles    compile it but don't run it (it reads files, waits for input, ...)
//   no-check    leave it alone (a fragment that can't stand on its own)
//
// An example can use what earlier examples on the same page declared (only what it uses is brought
// in), and imports the compiler suggests are added, so examples can stay short. A `// prints ...` comment checks what a line
// prints instead of its value: `// prints nothing`, `// prints total: 3`.
//
// The compiler is FCKT, or fckt on the PATH. Pages whose examples are kiln builds (the kiln and
// testing pages, docs/libraries and docs/examples) aren't checked yet.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir, cpus } from 'node:os'

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

// The fenced blocks of a page, with what immediately follows each one.
function blocksOf(text) {
  const fence = /^```(\S*)(.*)\n([\s\S]*?)^```\s*$/gm
  const found = []
  for (let m; (m = fence.exec(text)); ) {
    found.push({ lang: m[1], words: m[2].trim().split(/\s+/).filter(Boolean), code: m[3], start: m.index, end: fence.lastIndex })
  }
  return found.map((block, i) => {
    const next = found[i + 1]
    const adjacent = next && !text.slice(block.end, next.start).trim() && ['', 'text'].includes(next.lang)
    return { ...block, line: text.slice(0, block.start).split('\n').length, after: adjacent ? next.code : null }
  })
}

const KEYWORD = /^(import|type|module|spec|effect|external|annotation) /
const MODIFIERS = /^((@\w+(<[^>]*>)?(\([^)]*\))?|private|internal|operator|opaque|abstract) +)*/

// Whether an item declares something (a function, type, module, ...) rather than running code.
function isDeclaration(item) {
  const text = item.join('\n').replace(MODIFIERS, '')
  if (KEYWORD.test(text) || /^@/.test(item[0])) return true
  // An extension property: `String.shout: String = ...`
  if (/^[A-Z]\w*(<[^>]*>)?\.\w+: [^=]+ =/.test(text)) return true
  // A function: a name (perhaps on a type, perhaps generic), its parameters, then `=` or a type.
  const head = text.match(/^([A-Z]\w*(<[^>]*>)?\.)?[a-z_]\w*(<[^>]*>)?\(/)
  if (!head) return false
  let depth = 0, i = head[0].length - 1
  for (; i < text.length; i++) {
    if ('([{'.includes(text[i])) depth++
    else if (')]}'.includes(text[i]) && --depth === 0) break
  }
  return /^(: [^\n]+?)? =(\s|$)/.test(text.slice(i + 1))
}

const BINDING = /^(var |val )?(\([\w, ]+\)|[\w]+)(: [^=]+)? = /
const COMMENT = /^(.*?)\s+\/\/ (.*)$/

// Splits code into top-level items: a line at the margin and the indented or closing lines after it.
function itemsOf(code) {
  const items = []
  for (const line of code.replace(/\n+$/, '').split('\n')) {
    if (!line.trim()) continue
    if (items.length && /^[\s})\]]/.test(line)) items.at(-1).push(line)
    else items.push([line])
  }
  return items.filter(item => item[0].trim() && !item[0].startsWith('//'))
}

// What an item declares, so a later example's declaration of the same name replaces it.
function nameOf(item) {
  const first = item[0]
  if (first.startsWith('import ')) return first
  const rest = first.replace(MODIFIERS, '').replace(/^external /, '')
  const kind = rest.match(/^(annotation type|type|module|spec|effect) (\w+)/)
  if (kind) return kind[2]
  const extension = rest.match(/^([A-Z]\w*)(<[^>]*>)?\.(\w+)/)
  if (extension) return `${extension[1]}.${extension[3]}`
  return rest.match(/^\(?([\w., ]+?)\)?(<[^>]*>)?[(:= ]/)?.[1] ?? first
}

const isMain = code => /^(@\S+ |@.*\n)*main\(/m.test(code)

// The items of an example that later examples on the same page can use.
function contextOf(code) {
  return itemsOf(code)
    .filter(item => isDeclaration(item) || (BINDING.test(item[0]) && !item[0].startsWith('var ')))
    .filter(item => nameOf(item) !== 'main')
    .map(item => item.map(l => l.replace(/\s+\/\/ .*$/, '')))
}

function programOf(code, context) {
  const own = itemsOf(code)
  const ownNames = new Set(contextOf(code).map(nameOf))
  // Only what this example uses, or what that uses in turn, is brought in from earlier examples.
  const candidates = context.filter(item => !ownNames.has(nameOf(item)))
  const kept = new Set(candidates.filter(item => item[0].startsWith('import ')))
  for (let grew = true; grew; ) {
    grew = false
    const used = [code, ...[...kept].filter(item => !item[0].startsWith('import ')).map(item => item.join('\n'))].join('\n')
    for (const item of candidates) {
      if (!kept.has(item) && new RegExp(`\\b${nameOf(item).split('.').at(-1)}\\b`).test(used)) (kept.add(item), (grew = true))
    }
  }
  const inherited = candidates.filter(item => kept.has(item))
  if (isMain(code)) {
    // A whole program: it can use what came before, but runs as it's written.
    const items = [...inherited.filter(isDeclaration), ...own].map(item => item.join('\n'))
    const imports = [...new Set(items.filter(t => t.startsWith('import ')))]
    return { source: [...imports, ...items.filter(t => !t.startsWith('import '))].join('\n') + '\n', expected: [] }
  }
  // A value that a declaration uses has to be declared at the top level too.
  const declared = [...inherited, ...own].filter(isDeclaration).map(item => item.join('\n'))
  const isTopLevel = item => isDeclaration(item) ||
    (BINDING.test(item[0]) && !item[0].startsWith('var ') && declared.some(d => new RegExp(`\\b${nameOf(item)}\\b`).test(d)))
  const top = [], body = [], expected = []
  for (const item of inherited) isTopLevel(item) ? top.push(item.join('\n')) : body.push(item.map(l => '  ' + l).join('\n'))
  for (const item of own) {
    if (isTopLevel(item)) { top.push(item.map(l => l.replace(/\s+\/\/ .*$/, '')).join('\n')); continue }
    const last = item.at(-1).match(COMMENT)
    const statement = BINDING.test(item[0]) || /^(if|for|while) /.test(item[0])
    if (last && last[2].startsWith('prints ')) {
      const i = expected.push(last[2]) - 1
      body.push(`  println("@@<${i}")`, ...[...item.slice(0, -1), last[1]].map(l => '  ' + l), `  println("@@>${i}")`)
    } else if (last && !statement) {
      const i = expected.push(last[2]) - 1
      body.push(`  result${i} = ${[...item.slice(0, -1), last[1]].join('\n  ')}`, `  println("@@${i} \${result${i}}")`)
    } else {
      body.push(...item.map(l => '  ' + l.replace(/\s+\/\/ .*$/, '')))
    }
  }
  const imports = [...new Set(top.filter(t => t.startsWith('import ')))]
  if (!imports.some(t => t.startsWith('import fckt.io.Console'))) imports.unshift('import fckt.io.Console')
  const declarations = top.filter(t => !t.startsWith('import '))
  return { source: `${imports.join('\n')}\n${declarations.join('\n')}\n\nmain() = {\n${body.join('\n')}\n  Unit\n}\n`, expected }
}

// What each `// result` or `// prints ...` line printed.
function resultsOf(stdout) {
  const results = {}
  let open = null, printed = []
  for (const line of stdout.split('\n')) {
    let m
    if ((m = line.match(/^@@(\d+) (.*)$/))) results[m[1]] = m[2]
    else if ((m = line.match(/^@@<(\d+)$/))) (open = m[1]), (printed = [])
    else if ((m = line.match(/^@@>(\d+)$/))) (results[m[1]] = printed.length ? 'prints ' + printed.join(', then ') : 'prints nothing'), (open = null)
    else if (open !== null) printed.push(line)
  }
  return results
}

const matches = (expected, got) =>
  got !== undefined && (got === expected || expected.startsWith(got + ',') || expected.startsWith(got + ' '))

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
      const missing = [...new Set([...message.matchAll(/(import [\w.*]+) has one/g)].map(m => m[1]))]
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
    const got = resultsOf(stdout)
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
    // An example that's meant not to compile still declares types later examples use.
    const meantToFail = block.after?.startsWith('error:')
    const added = contextOf(block.code).filter(item => !meantToFail || /^type /.test(item[0].replace(MODIFIERS, '')))
    const names = new Set(added.map(nameOf))
    context = [...context.filter(item => !names.has(nameOf(item))), ...added]
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
