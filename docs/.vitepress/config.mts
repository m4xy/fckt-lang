import { defineConfig } from 'vitepress'
import fckt from './fckt.tmLanguage.json'
import { inlineFckt } from './inline-code'

const highlightInline = await inlineFckt(fckt)

export default defineConfig({
  title: 'fckt',
  description: "A functional programming language with Kotlin's syntax, compiled to OCaml.",
  base: '/fckt-lang/',
  cleanUrls: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/fckt-lang/favicon.svg' }]],
  markdown: {
    languages: [{ ...(fckt as any), name: 'fckt', aliases: ['fk'] }],
    config: highlightInline,
  },
  themeConfig: {
    logo: { light: '/lockup.svg', dark: '/lockup-dark.svg', alt: 'fckt' },
    siteTitle: false,
    nav: [
      { text: 'Docs', link: '/getting-started', activeMatch: '^/(getting-started|basic-syntax|idioms)' },
      { text: 'kiln', link: 'https://github.com/m4xy/kiln' },
    ],
    sidebar: [
      {
        text: 'Get started',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Basic syntax', link: '/basic-syntax' },
          { text: 'Idioms', link: '/idioms' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/m4xy/fckt' }],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    footer: { message: 'fckt is a functional programming language. The name is a coincidence.' },
  },
})
