import type MarkdownIt from 'markdown-it'
import { contextAfter, runsSomething } from './examples.js'

// Pages whose examples need libraries built with kiln, which a browser can't run.
const notRunnable = [/^libraries\//, /^examples\//, /^kiln\.md$/, /^testing\.md$/]

const attribute = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Marks each fckt example that can run in the browser, and shows something when it does, with what earlier examples on its page
// declared, so the Run button can make it into the same program the examples checker runs.
export function runnable(md: MarkdownIt) {
  md.core.ruler.push('fckt-runnable', state => {
    if (notRunnable.some(page => page.test(state.env.relativePath ?? ''))) return
    let context: string[][] = []
    state.tokens.forEach((token, i) => {
      if (token.type !== 'fence') return
      const [lang, ...words] = token.info.trim().split(/\s+/)
      if (lang !== 'fckt' || words.includes('no-check') || words.some(w => w.startsWith('lesson-'))) return
      const next = state.tokens[i + 1]
      const meantToFail = next?.type === 'fence' && ['', 'text'].includes(next.info.trim()) && next.content.startsWith('error:')
      // An example that only declares things prints nothing, so it has nothing to run, unless it's
      // meant not to compile, when running it shows the error.
      if (!words.includes('compiles') && (meantToFail || runsSomething(token.content))) token.meta = { ...token.meta, fcktContext: context }
      context = contextAfter(context, token.content, meantToFail)
    })
  })
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = fence(tokens, idx, options, env, self)
    const context = tokens[idx].meta?.fcktContext
    return context ? `<div class="fckt-runnable" data-context="${attribute(JSON.stringify(context))}">${html}</div>` : html
  }
}

// Gathers a lesson's starting code, solution, check and hints into one element, where its first
// block was, for the page to make into an exercise. The blocks themselves aren't shown.
export function lessons(md: MarkdownIt) {
  md.core.ruler.push('fckt-lessons', state => {
    const parts = state.tokens.filter(t => t.type === 'fence' && /\blesson-/.test(t.info))
    if (!parts.length) return
    const of = (word: string) => parts.filter(t => t.info.split(/\s+/).includes(word)).map(t => t.content.replace(/\n$/, ''))
    const lesson = {
      starter: of('lesson-starter')[0] ?? '',
      solution: of('lesson-solution')[0] ?? '',
      check: of('lesson-check')[0] ?? '',
      hints: of('lesson-hint'),
    }
    const first = state.tokens.indexOf(parts[0])
    const holder = new state.Token('html_block', '', 0)
    holder.content = `<div class="fckt-lesson" data-lesson="${attribute(JSON.stringify(lesson))}"></div>\n`
    state.tokens.splice(first, 1, holder)
    for (const part of parts.slice(1)) state.tokens.splice(state.tokens.indexOf(part), 1)
  })
}
