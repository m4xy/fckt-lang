#!/usr/bin/env bash
# Builds what runs fckt in the browser into docs/public/playground:
#
#   compiler.js   fckt's self-hosted compiler, with the core and standard library's source
#   toplevel.js   an OCaml toplevel with the core and standard library already loaded
#
# Both are compiled to JavaScript with js_of_ocaml. Needs a fckt checkout (FCKT_REPO), its built
# compiler (FCKT), and an opam switch with js_of_ocaml, js_of_ocaml-ppx and js_of_ocaml-toplevel.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
FCKT_REPO="$(cd "${FCKT_REPO:-$here/../../fckt}" && pwd)"
FCKT="${FCKT:-$FCKT_REPO/build/install/fckt/bin/fckt}"
out="$here/../docs/public/playground"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# js_of_ocaml's runtime stubs are linked into bytecode from opam's stublibs.
export CAML_LD_LIBRARY_PATH="$(opam var lib)/stublibs${CAML_LD_LIBRARY_PATH:+:$CAML_LD_LIBRARY_PATH}"
std_packages=$(cd "$FCKT_REPO/std/src" && find fckt -mindepth 1 -type d | tr / .)

cd "$work"
"$FCKT" --core -o fckt_core.ml
# shellcheck disable=SC2086
"$FCKT" --library std -o fckt_std.ml --no-std -I "$FCKT_REPO/std/src" $std_packages
ocamlfind ocamlc -package unix -c fckt_core.ml fckt_std.ml

# The compiler, from its packages' source, as kiln would build it.
"$FCKT" "$FCKT_REPO/compiler/src/main.fk" -o compiler.ml --separate --no-std -L std \
  -I "$FCKT_REPO/compiler/src" --other-project "$FCKT_REPO/lowering/src" \
  --other-project "$FCKT_REPO/checker/src" --other-project "$FCKT_REPO/parser/src"
python3 "$here/web_entry.py" compiler.ml compiler_web.ml
ocamlfind ocamlc -package unix,js_of_ocaml,js_of_ocaml-ppx -linkpkg fckt_core.cmo fckt_std.cmo compiler_web.ml -o compiler.byte

# The core and the standard library's source go in the compiler's pseudo filesystem, where it
# reads them as it does from a fckt checkout.
files=()
while IFS= read -r f; do files+=(--file "$FCKT_REPO/$f:/static/$f"); done \
  < <(cd "$FCKT_REPO" && find src/main/resources/std std/src -name '*.fk' | sort)

mkdir -p "$out"
js_of_ocaml --effects=cps --quiet "$here/stubs.js" "${files[@]}" compiler.byte -o "$out/compiler.js"

cp "$here/top.ml" .
ocamlfind ocamlc -package js_of_ocaml-toplevel,js_of_ocaml-ppx,unix -linkpkg -linkall \
  fckt_core.cmo fckt_std.cmo top.ml -o toplevel.byte
js_of_ocaml --toplevel --linkall --effects=cps --quiet "$here/stubs.js" toplevel.byte -o "$out/toplevel.js"

ls -l "$out"
