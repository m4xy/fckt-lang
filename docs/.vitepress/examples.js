// How a fckt example in the docs becomes a program. The examples checker, the site build and the
// Run button in the browser all use this, so an example runs the same way everywhere.
//
// Declarations stay at the top level and everything else runs in main. A line ending in
// `// result` prints its value, marked so the result can be found in the output, and a line ending
// in `// prints ...` has what it prints marked out instead. An example can use what earlier
// examples on the same page declared (only what it uses is brought in), and a block that declares
// main runs as it's written.

const KEYWORD = /^(import|type|module|spec|effect|external|annotation) /
const MODIFIERS = /^((@\w+(<[^>]*>)?(\([^)]*\))?|private|internal|operator|opaque|abstract) +)*/
const BINDING = /^(var |val )?(\([\w, ]+\)|[\w]+)(: [^=]+)? = /
const COMMENT = /^(.*?)\s+\/\/ (.*)$/

// The fenced blocks of a page, with what immediately follows each one.
export function blocksOf(text) {
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

// Whether an item declares something (a function, type, module, ...) rather than running code.
export function isDeclaration(item) {
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
export function nameOf(item) {
  const first = item[0]
  if (first.startsWith('import ')) return first
  const rest = first.replace(MODIFIERS, '').replace(/^external /, '')
  const kind = rest.match(/^(annotation type|type|module|spec|effect) (\w+)/)
  if (kind) return kind[2]
  const extension = rest.match(/^([A-Z]\w*)(<[^>]*>)?\.(\w+)/)
  if (extension) return `${extension[1]}.${extension[3]}`
  return rest.match(/^\(?([\w., ]+?)\)?(<[^>]*>)?[(:= ]/)?.[1] ?? first
}

export const isMain = code => /^(@\S+ |@.*\n)*main\(/m.test(code)

// Whether running an example shows anything: it has a main, or code that runs rather than only
// declarations and values.
export const runsSomething = code => isMain(code) || itemsOf(code).some(item => !isDeclaration(item) && !BINDING.test(item[0]))

// The items of an example that later examples on the same page can use.
function contextOf(code) {
  return itemsOf(code)
    .filter(item => isDeclaration(item) || (BINDING.test(item[0]) && !item[0].startsWith('var ')))
    .filter(item => nameOf(item) !== 'main')
    .map(item => item.map(l => l.replace(/\s+\/\/ .*$/, '')))
}

// The context after an example: what the examples so far declared, this one's replacing any of the
// same name. An example that's meant not to compile only adds the types it declares.
export function contextAfter(context, code, meantToFail) {
  const added = contextOf(code).filter(item => !meantToFail || /^type /.test(item[0].replace(MODIFIERS, '')))
  const names = new Set(added.map(nameOf))
  return [...context.filter(item => !names.has(nameOf(item))), ...added]
}

// The program an example runs as, and the results its comments expect, in order.
export function programOf(code, context) {
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

// The imports a compiler error suggests, as in "import fckt.collections.Maps.* has one".
export const suggestedImports = message => [...new Set([...message.matchAll(/(import [\w.*]+) has one/g)].map(m => m[1]))]

// What each `// result` or `// prints ...` line printed, and everything else the program printed.
export function resultsOf(stdout) {
  const results = {}, other = []
  let open = null, printed = []
  for (const line of stdout.replace(/\n$/, '').split('\n')) {
    let m
    if ((m = line.match(/^@@(\d+) (.*)$/))) results[m[1]] = m[2]
    else if ((m = line.match(/^@@<(\d+)$/))) (open = m[1]), (printed = [])
    else if ((m = line.match(/^@@>(\d+)$/))) (results[m[1]] = printed.length ? 'prints ' + printed.join(', then ') : 'prints nothing'), (open = null)
    else if (open !== null) printed.push(line)
    else other.push(line)
  }
  return { results, other: other.filter((l, i) => l || i < other.length - 1) }
}

// Whether a result is what a comment expects. The comment can explain after a comma or a space:
// `// -7, the same as subtractFrom(3, 10)`.
export const matches = (expected, got) =>
  got !== undefined && (got === expected || expected.startsWith(got + ',') || expected.startsWith(got + ' '))

// An example as a program to open in the playground: what programOf makes, with results printed
// plainly instead of marked for checking.
export function playgroundProgram(code, context) {
  const lines = programOf(code, context).source.split('\n').filter(line => !/^\s*println\("@@[<>]\d+"\)$/.test(line))
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const value = lines[i].match(/^  result(\d+) = (.*)$/)
    if (value && lines[i + 1] === `  println("@@${value[1]} \${result${value[1]}}")`) {
      out.push(`  println("\${${value[2]}}")`)
      i++
    } else {
      out.push(lines[i].replace(/println\("@@(\d+) \$\{(result\d+)\}"\)/, 'println("${$2}")'))
    }
  }
  // main ends with Unit so it has a result whatever came before; a println already gives one.
  const end = out.lastIndexOf('  Unit')
  if (end > 0 && /^  println\(/.test(out[end - 1])) out.splice(end, 1)
  return out.join('\n')
}

// A lesson's check: the reader's code with the lesson's hidden test after it. The test's main calls
// expect(passed, problem) for each thing it checks.
const EXPECT = `@Console expect(passed: Boolean, problem: String): Unit = if (passed) println("@@pass") else println("@@fail $problem")`

export function lessonProgram(code, check) {
  const isImport = line => line.startsWith('import ')
  const lines = [...code.split('\n'), '', ...check.split('\n')]
  const imports = [...new Set(['import fckt.io.Console', ...lines.filter(isImport)])]
  return [...imports, '', ...code.split('\n').filter(l => !isImport(l)), '', EXPECT, '', ...check.split('\n').filter(l => !isImport(l))].join('\n') + '\n'
}

// Whether a lesson's check passed, and if not, the first thing it found wrong.
export function lessonOutcome(stdout) {
  const failed = stdout.split('\n').find(l => l.startsWith('@@fail '))
  if (failed) return { passed: false, problem: failed.slice('@@fail '.length) }
  return stdout.includes('@@pass') ? { passed: true } : { passed: false, problem: 'The check printed nothing.' }
}
