# fckt-lang

The home of [fckt](https://github.com/m4xy/fckt): its documentation site and its brand.

- `docs/` is the site, built with [VitePress](https://vitepress.dev). Pages are Markdown; code in
  ` ```fckt ` blocks is highlighted with the grammar from fckt's `editors/vscode`.
- `brand/` holds the logo: `lockup.svg` and `lockup-dark.svg` (the wordmark), `mark.svg` and
  `mark-dark.svg` (the ƒ on its own), `app-icon.svg` and `favicon.svg`. The letters are outlines,
  so the files need no fonts.

```sh
npm install
npm run dev       # serves the site with live reload
npm run build     # writes docs/.vitepress/dist
npm run check     # compiles and runs every example (needs fckt and ocaml; FCKT= picks the compiler)
```

## Examples are checked

`npm run check` turns each ` ```fckt ` block into a program, compiles it, runs it, and compares
what it prints with the page. The site only deploys when every example passes, and it's checked
against fckt's `main` every day, so a change to the language shows up as a failed deploy.

- A line ending in `// result` has to print that result. Text after a comma or a space can explain
  it: `// -7, the same as subtractFrom(3, 10)`.
- `// prints ...` checks what a line prints instead: `// prints nothing`,
  `// prints one, then two`.
- A block followed straight away by a plain block starting `error:` has to fail with that error.
- A block with a `main` runs as it is. A plain block straight after it is its output.
- An example can use what earlier examples on the same page declared, and can leave out imports
  the compiler can suggest.
- ` ```fckt compiles ` only compiles the example, for code that reads files or waits for input.
- ` ```fckt no-check ` leaves it alone, for fragments and examples that span several files.

The kiln and testing pages, and everything under `docs/libraries` and `docs/examples`, need
libraries built with kiln and aren't checked yet.
