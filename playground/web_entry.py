"""Turns the OCaml of fckt's self-hosted compiler into a version a web page can call.

    python3 web_entry.py compiler.ml compiler_web.ml

In a browser there's no command line, so the compiler's `let () =` that runs main becomes
run_main, and fcktCompile(source) compiles a program from the pseudo filesystem, where the core
and the standard library are too. Parses are kept, since every program is compiled against the
same standard library.
"""
import sys

source, target = sys.argv[1], sys.argv[2]
ml = open(source).read()


def replace_once(text, old, new):
    if text.count(old) != 1:
        sys.exit(f"web_entry.py: expected one {old.strip()[:60]!r} in {source}, found {text.count(old)}")
    return text.replace(old, new)


ml = replace_once(ml, "      let parse (source : string) : (source_file, syntax_error list) result =\n", """\
      let parse_cache : (string, (source_file, syntax_error list) result) Hashtbl.t = Hashtbl.create 64
      let rec parse (source : string) : (source_file, syntax_error list) result =
        match Hashtbl.find_opt parse_cache source with
        | Some parsed -> parsed
        | None -> let parsed = parse_uncached source in Hashtbl.replace parse_cache source parsed; parsed
      and parse_uncached (source : string) : (source_file, syntax_error list) result =
""")

start = ml.rindex("\nlet () =\n")
main = replace_once(ml[start + len("\nlet () =\n"):], "(List.tl (Array.to_list Sys.argv))", "!browser_args")
ml = ml[:start] + """
let browser_args = ref []

let run_main () =
""" + main + """
let () =
  let open Js_of_ocaml in
  let errors = Buffer.create 256 in
  Sys_js.set_channel_flusher stderr (Buffer.add_string errors);
  Js.export "fcktCompile" (Js.wrap_callback (fun source ->
    Buffer.clear errors;
    Out_channel.with_open_bin "/static/main.fk" (fun c -> output_string c (Js.to_string source));
    (try Sys.remove "/static/out.ml" with Sys_error _ -> ());
    browser_args := ["/static/main.fk"; "/static/out.ml"];
    (try run_main () with
     | Stdlib.Exit -> ()
     (* The compiler ends with exit 1 when a program has errors, which a browser can't do; the
        errors are written by then. *)
     | Invalid_argument m when m = "Function 'exit' not implemented" -> ()
     | e -> Buffer.add_string errors (Printexc.to_string e));
    flush stderr;
    let ocaml = if Sys.file_exists "/static/out.ml" then In_channel.with_open_bin "/static/out.ml" In_channel.input_all else "" in
    object%js
      val ocaml = Js.string ocaml
      val errors = Js.string (Buffer.contents errors)
    end))
"""
open(target, "w").write(ml)
