import { defineConfig } from 'vitepress'
import fckt from './fckt.tmLanguage.json'

export default defineConfig({
  title: 'fckt',
  description: "A functional programming language with Kotlin's syntax, compiled to OCaml.",
  base: '/fckt-lang/',
  cleanUrls: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/fckt-lang/favicon.svg' }]],
  markdown: {
    languages: [{ ...(fckt as any), name: 'fckt', aliases: ['fk'] }],
  },
  themeConfig: {
    logo: { light: '/lockup.svg', dark: '/lockup-dark.svg', alt: 'fckt' },
    siteTitle: false,
    nav: [
      { text: 'Docs', link: '/getting-started', activeMatch: '^/(getting-started|basic-syntax|idioms|coming-from-kotlin)' },
      { text: 'kiln', link: 'https://github.com/m4xy/kiln' },
    ],
    sidebar: [
      {
        text: 'Get started',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Basic syntax', link: '/basic-syntax' },
          { text: 'Idioms', link: '/idioms' },
          { text: 'Coming from Kotlin', link: '/coming-from-kotlin' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/m4xy/fckt' }],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    footer: { message: 'fckt is a functional programming language. The name is a coincidence.' },
  },
})
