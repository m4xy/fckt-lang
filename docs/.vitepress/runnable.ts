import type MarkdownIt from 'markdown-it'
import { contextAfter } from './examples.js'

// Pages whose examples need libraries built with kiln, which a browser can't run.
const notRunnable = [/^libraries\//, /^examples\//, /^kiln\.md$/, /^testing\.md$/]

const attribute = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Marks each fckt example that can run in the browser with what earlier examples on its page
// declared, so the Run button can make it into the same program the examples checker runs.
export function runnable(md: MarkdownIt) {
  md.core.ruler.push('fckt-runnable', state => {
    if (notRunnable.some(page => page.test(state.env.relativePath ?? ''))) return
    let context: string[][] = []
    state.tokens.forEach((token, i) => {
      if (token.type !== 'fence') return
      const [lang, ...words] = token.info.trim().split(/\s+/)
      if (lang !== 'fckt' || words.includes('no-check')) return
      const next = state.tokens[i + 1]
      const meantToFail = next?.type === 'fence' && ['', 'text'].includes(next.info.trim()) && next.content.startsWith('error:')
      if (!words.includes('compiles')) token.meta = { ...token.meta, fcktContext: context }
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
