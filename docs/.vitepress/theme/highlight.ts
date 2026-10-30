import type { HighlighterCore } from 'shiki/core'

// Highlights fckt as the site's code blocks are, for code someone is editing. Shiki's JavaScript
// regex engine reads the fckt grammar exactly as the build's does, so no WebAssembly is needed.
let highlighter: Promise<HighlighterCore> | null = null

function load(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, grammar, light, dark] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('../fckt.tmLanguage.json'),
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ])
    return createHighlighterCore({
      themes: [light.default, dark.default],
      langs: [{ ...(grammar.default as any), name: 'fckt' }],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  return highlighter
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The code as HTML spans coloured for both themes, through the --shiki-light and --shiki-dark
// variables the site's CSS already switches between.
export async function highlighted(code: string): Promise<string> {
  const { tokens } = (await load()).codeToTokens(code, {
    lang: 'fckt',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
  return tokens.map(line => line.map(token => {
    const style = Object.entries(token.htmlStyle ?? {}).map(([k, v]) => `${k}:${v}`).join(';')
    return `<span style="${style}">${escape(token.content)}</span>`
  }).join('')).join('\n')
}
