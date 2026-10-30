import { withBase } from 'vitepress'
import { programOf, suggestedImports } from '../examples.js'

// Compiles and runs fckt in the browser: fckt's own compiler and an OCaml toplevel, each compiled
// to JavaScript and run in a worker, so the page stays responsive. Neither loads until the first run.

type Pending = (data: any) => void
const STEP_LIMIT_MS = 10_000

class Channel {
  private worker: Worker | null = null
  private pending = new Map<number, Pending>()
  private next = 0
  constructor(private file: string) {}

  ask(message: object): Promise<any> {
    this.worker ??= this.start()
    const id = this.next++
    return new Promise(resolve => {
      this.pending.set(id, resolve)
      this.worker!.postMessage({ id, ...message })
    })
  }

  // Ends whatever it's doing, for a program that doesn't finish. The next ask starts it again.
  stop() {
    this.worker?.terminate()
    this.worker = null
    this.pending.forEach(resolve => resolve(null))
    this.pending.clear()
  }

  private start() {
    const worker = new Worker(withBase(`/playground/${this.file}`))
    worker.onmessage = ({ data }) => {
      this.pending.get(data.id)?.(data)
      this.pending.delete(data.id)
    }
    return worker
  }
}

const compiler = new Channel('compile-worker.js')
const runner = new Channel('run-worker.js')

export type Outcome =
  | { kind: 'printed'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'stopped'; text: string }

// The compiler's errors, with line numbers counted in the code the reader wrote rather than the
// program it was made into, where they can be found there.
function errorsIn(errors: string, program: string, code: string): string {
  const programLines = program.split('\n'), codeLines = code.split('\n').map(l => l.trim())
  return errors.trim().split('\n').map(line => {
    const m = line.match(/^\/static\/main\.fk:(\d+):(\d+): (.*)$/)
    if (!m) return line
    const found = codeLines.indexOf(programLines[Number(m[1]) - 1]?.trim().replace(/^result\d+ = /, ''))
    return found >= 0 ? `line ${found + 1}: ${m[3]}` : m[3]
  }).join('\n')
}

// What a program printed, with the markers that tie each result to its comment taken out.
const shown = (stdout: string) =>
  stdout.split('\n').filter(l => !/^@@[<>]\d+$/.test(l)).map(l => l.replace(/^@@\d+ /, '')).join('\n').trimEnd()

// Compiles source, adding the imports the compiler suggests, as the docs' examples leave them out.
async function compile(source: string): Promise<{ ocaml: string; errors: string; source: string }> {
  for (let attempt = 0; ; attempt++) {
    const { ocaml, errors } = await compiler.ask({ source })
    const missing = suggestedImports(errors)
    if (ocaml || !missing.length || attempt >= 3) return { ocaml, errors, source }
    source = missing.join('\n') + '\n' + source
  }
}

export async function run(code: string, context: string[][] = []): Promise<Outcome> {
  const program = programOf(code, context).source
  const compiled = await compile(program)
  if (!compiled.ocaml) return { kind: 'error', text: errorsIn(compiled.errors, compiled.source, code) }
  const timer = setTimeout(() => runner.stop(), STEP_LIMIT_MS)
  const ran = await runner.ask({ ocaml: compiled.ocaml })
  clearTimeout(timer)
  if (!ran) return { kind: 'stopped', text: `Stopped after ${STEP_LIMIT_MS / 1000} seconds.` }
  const text = shown(ran.output)
  if (!ran.ok) return { kind: 'error', text: [text, ran.errors.trim()].filter(Boolean).join('\n') }
  return { kind: 'printed', text }
}
