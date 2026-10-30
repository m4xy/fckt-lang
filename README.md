# fckt-lang

The home of [fckt](https://github.com/m4xy/fckt): its documentation site and its brand.

- `docs/` is the site, built with [VitePress](https://vitepress.dev). Pages are Markdown; code in
  ` ```fckt ` blocks is highlighted with the grammar from fckt's `editors/vscode`.
- `brand/` holds the logo: `lockup.svg` and `lockup-dark.svg` (the wordmark), `mark.svg` and
  `mark-dark.svg` (the ƒ on its own), `lockup-outlined.svg` and `lockup-outlined-dark.svg` (the wordmark
  in a frame as thick as its letters, used in the site's header), `app-icon.svg` and `favicon.svg`. The letters are outlines,
  so the files need no fonts.

```sh
npm install
npm run dev       # serves the site with live reload
npm run build     # writes docs/.vitepress/dist
npm run check     # compiles and runs every example (needs fckt and ocaml; FCKT= picks the compiler)
```

## Running fckt in the browser

The [playground](https://m4xy.github.io/fckt-lang/playground) and the Run button on the docs'
examples compile and run fckt in the reader's browser, with nothing sent to a server.
`playground/build.sh` builds what they need into `docs/public/playground`:

- `compiler.js` is fckt's self-hosted compiler, compiled to JavaScript with js_of_ocaml, with the
  core and standard library's source in its pseudo filesystem. `web_entry.py` gives it the
  `fcktCompile(source)` a page calls instead of its command line, and `stubs.js` what js_of_ocaml
  lacks.
- `toplevel.js` is an OCaml toplevel with fckt's core and standard library loaded, which runs the
  OCaml the compiler writes (`top.ml`).

Each runs in a worker (`compile-worker.js`, `run-worker.js`), loaded on the first run. It needs a
fckt checkout (`FCKT_REPO`, by default `../fckt`) with its compiler built, and an opam switch with
`js_of_ocaml`, `js_of_ocaml-ppx` and `js_of_ocaml-toplevel`. An example is made into a program as
`docs/.vitepress/examples.js` says, the same way `npm run check` makes it, so what the Run button
runs is what the deploy checked. Pages under `docs/libraries` and `docs/examples`, and the kiln and
testing pages, need kiln libraries and have no Run button.

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
