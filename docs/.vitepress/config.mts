import { defineConfig } from 'vitepress'
import fckt from './fckt.tmLanguage.json'
import { inlineFckt } from './inline-code'

const highlightInline = await inlineFckt(fckt)

export default defineConfig({
  title: 'fckt',
  description: 'A statically typed functional programming language.',
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
      { text: 'Docs', link: '/getting-started', activeMatch: '^/(?!standard-library|$)' },
      { text: 'Standard library', link: '/standard-library' },
      { text: 'kiln', link: 'https://github.com/m4xy/kiln' },
    ],
    sidebar: [
      {
        text: 'Get started',
        items: [
          { text: 'Why fckt', link: '/why' },
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Basic syntax', link: '/basic-syntax' },
          { text: 'Idioms', link: '/idioms' },
        ],
      },
      {
        text: 'Language',
        items: [
          { text: 'Types', link: '/types' },
          { text: 'Functions', link: '/functions' },
          { text: 'Control flow', link: '/control-flow' },
          { text: 'Collections and text', link: '/collections' },
          { text: 'Effects', link: '/effects' },
          { text: 'Handlers', link: '/handlers' },
          { text: 'Mutation', link: '/mutation' },
          { text: 'Modules and packages', link: '/modules' },
          { text: 'Specs and functors', link: '/specs-and-functors' },
          { text: 'Annotations', link: '/annotations' },
          { text: 'Calling OCaml', link: '/externals' },
        ],
      },
      {
        text: 'Tools',
        items: [
          { text: 'Building with kiln', link: '/kiln' },
          { text: 'Testing', link: '/testing' },
          { text: 'The compiler', link: '/compiler' },
          { text: 'Editor support', link: '/editors' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'Standard library', link: '/standard-library' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/m4xy/fckt' }],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
  },
})
