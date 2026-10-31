import { defineConfig } from 'vitepress'
import fckt from './fckt.tmLanguage.json'
import { inlineFckt } from './inline-code'
import { lessons, runnable } from './runnable'

const highlightInline = await inlineFckt(fckt)

export default defineConfig({
  title: 'fckt',
  description: 'A statically typed functional programming language.',
  base: '/fckt-lang/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/fckt-lang/favicon.svg' }]],
  markdown: {
    languages: [{ ...(fckt as any), name: 'fckt', aliases: ['fk'] }],
    config: md => {
      highlightInline(md)
      runnable(md)
      lessons(md)
    },
  },
  themeConfig: {
    logo: { light: '/lockup-outlined.svg', dark: '/lockup-outlined-dark.svg', alt: 'fckt' },
    siteTitle: false,
    nav: [
      { text: 'Docs', link: '/getting-started', activeMatch: '^/(?!standard-library/|libraries/|examples/|learn/|playground|$)' },
      { text: 'Standard library', link: '/standard-library/', activeMatch: '^/standard-library/' },
      { text: 'Libraries', link: '/libraries/', activeMatch: '^/libraries/' },
      { text: 'Learn', link: '/learn/', activeMatch: '^/learn/' },
      { text: 'Examples', link: '/examples/', activeMatch: '^/examples/' },
      { text: 'Playground', link: '/playground' },
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
            { text: 'HTML', link: '/libraries/html' },
            { text: 'Markdown', link: '/libraries/markdown' },
            { text: 'Dates and times', link: '/libraries/time' },
            { text: 'Logging', link: '/libraries/log' },
            { text: 'CSV', link: '/libraries/csv' },
          ],
        },
      ],
      '/learn/': [
        {
          text: 'Learn fckt',
          items: [
            { text: 'Overview', link: '/learn/' },
            { text: 'Values', link: '/learn/values' },
            { text: 'Functions', link: '/learn/functions' },
            { text: 'Lists and lambdas', link: '/learn/lists' },
            { text: 'Records', link: '/learn/records' },
            { text: 'Types with cases', link: '/learn/cases' },
            { text: 'Option', link: '/learn/option' },
            { text: 'Result', link: '/learn/result' },
            { text: 'Effects', link: '/learn/effects' },
            { text: 'Handlers', link: '/learn/handlers' },
            { text: 'Failing', link: '/learn/failing' },
            { text: 'Mutation', link: '/learn/mutation' },
            { text: 'Putting it together', link: '/learn/project' },
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
    editLink: {
      pattern: 'https://github.com/m4xy/fckt-lang/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'medium' } },
    search: { provider: 'local' },
  },
})
