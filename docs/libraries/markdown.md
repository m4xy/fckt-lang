# Markdown

[fk-markdown](https://github.com/m4xy/fk-markdown) reads Markdown and writes it as HTML, using
[fk-html](/libraries/html). It follows CommonMark, the standard description of Markdown, for the
parts people use every day, and reads GitHub's tables.

## Add it to your project

```fckt
project = Project(
  name = "notes",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-markdown:0.1.0")],
)
```

## Turn Markdown into HTML

```fckt
import uk.m4xy.markdown.Markdowns

Markdowns.render("# Hello\n\nSome *emphasis*, and [a link](https://fckt.dev).")
```

gives:

```
<h1 id="hello">Hello</h1><p>Some <em>emphasis</em>, and <a href="https://fckt.dev">a link</a>.</p>
```

## What it reads

- Headings, written with `#` to `######`, or underlined with `===` or `---`.
- Paragraphs, separated by blank lines.
- Code blocks, fenced with three backticks, optionally naming the language, or indented by four
  spaces.
- Quotes, with `>` at the start of each line.
- Lists, with `-`, `*` or `+`, or numbered. An item's further lines are indented to line up with
  its text, and that's how lists nest.
- Rules: a line of `---`, `***` or `___`.
- Tables, with a row of `|`-separated headings, a row of dashes under them, and a row for each
  line of the table. A colon at the start or end of the dashes aligns the column.
- In a paragraph: `*emphasis*`, `**strong emphasis**`, `` `code` ``, `[links](https://fckt.dev)`
  with an optional title, images written `![description](picture.png)`, addresses in angle brackets,
  backslash escapes, and line breaks, written as two spaces or a backslash at the end of a line.

Each heading gets an `id` the way GitHub makes them, so a link to `#getting-started` goes to the
heading "Getting started". `Markdowns.slugOf` tells you what id a heading's text gets.

HTML written inside the Markdown isn't passed through: it's shown as text. That makes it safe to
show Markdown that anyone wrote, such as comments on a page. Reference-style links aren't read
yet.

## Working with the document

`Markdowns.parse` gives you the document as values instead of text: a list of `Block`s, such as
`Heading`, `Paragraph` and `CodeBlock`, whose text is a list of `Inline`s, such as `Plain`,
`Emphasis` and `Link`. You can look through them, for example to build a table of contents, or
change them, and then write them with `Markdowns.html`, which gives fk-html's `Html` to put in a
page you build with it.

## The `markdown` command

fk-markdown comes with a small program that turns Markdown files into HTML. Build it from the
`cli` folder with `kiln compile`, then:

```sh
markdown notes.md > notes.html
markdown --page "My notes" notes.md > notes.html   # a whole document, with a title
```

With no files it reads standard input. To turn a whole folder of Markdown into a website, see
[fk-site](https://github.com/m4xy/fk-site).
