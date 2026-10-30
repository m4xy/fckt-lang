(* An OCaml toplevel with fckt's core and standard library linked in. fcktRun(code) evaluates the
   OCaml that fckt's compiler wrote for a program and gives back what it printed. *)
open Js_of_ocaml

let output = Buffer.create 1024

let run code =
  Buffer.clear output;
  let errors = Buffer.create 256 in
  let formatter = Format.formatter_of_buffer errors in
  let ok = Js_of_ocaml_toplevel.Direct.use formatter (Js.to_string code) in
  Format.pp_print_flush formatter ();
  flush stdout;
  flush stderr;
  Js_of_ocaml_toplevel.Direct.reset_toplevel_env ();
  object%js
    val ok = Js.bool ok
    val output = Js.string (Buffer.contents output)
    val errors = Js.string (Buffer.contents errors)
  end

let () =
  Js_of_ocaml_toplevel.Direct.initialize ();
  Sys_js.set_channel_flusher stdout (Buffer.add_string output);
  Sys_js.set_channel_flusher stderr (Buffer.add_string output);
  Js.export "fcktRun" (Js.wrap_callback run)
