import type MarkdownIt from 'markdown-it'
import { createHighlighter } from 'shiki'

// Inline code is fckt unless it's plainly something else: a path, a file, a flag or a shell command.
const notFckt = [
  /\//,
  /\.(fk|fki|ml|md|svg|json|sh|ts|mts)$/,
  /^-/,
  /^(kiln|fckt|ocaml|ocamlopt|ocamlfind|opam|git|npm|cd|export|brew)(\s|$)/,
]

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Highlights inline code with the same fckt grammar and themes as the code blocks.
export async function inlineFckt(grammar: object) {
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [{ ...(grammar as any), name: 'fckt' }],
  })
  return (md: MarkdownIt) => {
    const plain = md.renderer.rules.code_inline!
    md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
      const code = tokens[idx].content
      if (notFckt.some(pattern => pattern.test(code))) return plain(tokens, idx, options, env, self)
      const { tokens: lines } = highlighter.codeToTokens(code, {
        lang: 'fckt',
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
      const spans = lines.flat().map(token => {
        // Vue drops a span that holds only spaces, so spaces are left as plain text.
        if (!token.content.trim()) return token.content
        const style = Object.entries(token.htmlStyle ?? {}).map(([key, value]) => `${key}:${value}`).join(';')
        return `<span style="${style}">${escape(token.content)}</span>`
      })
      return `<code class="fckt-inline">${spans.join('')}</code>`
    }
  }
}
