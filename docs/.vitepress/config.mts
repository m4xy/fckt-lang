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
    logo: { light: '/lockup-outlined.svg', dark: '/lockup-outlined-dark.svg', alt: 'fckt' },
    siteTitle: false,
    nav: [
      { text: 'Docs', link: '/getting-started', activeMatch: '^/(?!standard-library/|libraries/|examples/|$)' },
      { text: 'Standard library', link: '/standard-library/', activeMatch: '^/standard-library/' },
      { text: 'Libraries', link: '/libraries/', activeMatch: '^/libraries/' },
      { text: 'Examples', link: '/examples/', activeMatch: '^/examples/' },
    ],
    sidebar: {
      '/standard-library/': [
        {
          text: 'Standard library',
          items: [
            { text: 'Overview', link: '/standard-library/' },
            { text: 'Collections', link: '/standard-library/collections' },
            { text: 'Option and Result', link: '/standard-library/option-and-result' },
            { text: 'Effects', link: '/standard-library/effects' },
            { text: 'Files and processes', link: '/standard-library/io' },
            { text: 'Concurrency', link: '/standard-library/concurrency' },
            { text: 'Time', link: '/standard-library/time' },
            { text: 'Text', link: '/standard-library/text' },
          ],
        },
      ],
      '/libraries/': [
        {
          text: 'Libraries',
          items: [
            { text: 'Overview', link: '/libraries/' },
            { text: 'HTTP', link: '/libraries/http' },
            { text: 'Serialization', link: '/libraries/serialization' },
            { text: 'SQLite', link: '/libraries/sqlite' },
            { text: 'Regular expressions', link: '/libraries/regex' },
            { text: 'Command-line arguments', link: '/libraries/cli' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'A command-line tool', link: '/examples/grep' },
            { text: 'A web service', link: '/examples/url-shortener' },
            { text: 'Counting words', link: '/examples/word-count' },
            { text: 'A todo list', link: '/examples/todo' },
          ],
        },
      ],
      '/': [
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
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/m4xy/fckt' }],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
  },
})
