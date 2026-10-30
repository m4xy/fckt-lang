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
```

Every code example in the docs is meant to compile and run as written; check new ones with `fckt`
before adding them.
