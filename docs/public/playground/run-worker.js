// Runs the OCaml fckt's compiler wrote: { id, ocaml } in, { id, ok, output, errors } out.
importScripts('toplevel.js')
onmessage = ({ data: { id, ocaml } }) => {
  const { ok, output, errors } = self.fcktRun(ocaml)
  postMessage({ id, ok, output, errors })
}
