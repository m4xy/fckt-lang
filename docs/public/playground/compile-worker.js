// Compiles fckt to OCaml off the page's thread: { id, source } in, { id, ocaml, errors } out.
importScripts('compiler.js')
onmessage = ({ data: { id, source } }) => {
  const { ocaml, errors } = self.fcktCompile(source)
  postMessage({ id, ocaml, errors })
}
