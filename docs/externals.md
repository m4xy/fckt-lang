# Calling OCaml

fckt programs compile to OCaml, so you can call any OCaml function from fckt. You do it with an
`external` declaration: a fckt signature whose body is a piece of OCaml.

Most code never needs this. The standard library is built on externals, and you'd use them yourself
to reach an OCaml library that fckt doesn't wrap yet.

## External functions

Write the function's signature as usual, then `=` and the OCaml to run, as a string. In the OCaml,
refer to the parameters by name, and to the receiver of an extension function as `this`:

```fckt
external String.slice(pos: Int, len: Int): String = "StringLabels.sub this ~pos ~len"

"functional".slice(0, 4)      // func
```

When an OCaml function takes labelled arguments, write `~name` to pass the parameter with the same
name as that label, as `~pos` and `~len` do here.

The compiler writes the OCaml out wherever the function is called, and trusts the types you
declared.

### Parameters inside parentheses

fckt only replaces parameter names that appear outside parentheses. If you need a parameter deeper
inside an expression, write an OCaml function and apply it to the parameters:

```fckt
external String.repeat(times: Int): String = "(fun s n -> String.concat \"\" (List.init n (fun _ -> s))) this times"

"ab".repeat(3)                // ababab
```

If a parameter is inside parentheses, you get this error:

```
error: an external's parameters are replaced only outside parentheses, so 'this' in (List.init times (fun _ -> this)) isn't; write a function applied to it, as (fun x -> ...) this
```

## External types

An external type is a type that OCaml defines. You create and use its values through external
functions. Write each type parameter `P` as `'p` in the OCaml type:

```fckt
external type Table<K, V> = "('k, 'v) Hashtbl.t"

external emptyTable<K, V>(size: Int): Table<K, V> = "Hashtbl.create size"

external Table<K, V>.find(key: K): Option<V> = "Hashtbl.find_opt this key"
```

## Externals that change things

If an external changes the value it's given, mark it `@Mutating`:

```fckt
@Mutating external Table<K, V>.put(key: K, value: V): Unit = "Hashtbl.replace this key value"
```

A function that calls it on a table it was given is `@Mutating` too, because the caller can see the
change:

```fckt
@Mutating remember(table: Table<String, Int>, word: String) = table.put(word, 1)
```

But a function that creates a table, changes it, and never lets it out stays pure. This one uses a
table to count words, and returns only a number:

```fckt
countOf(words: List<String>, word: String): Int = {
  table = emptyTable<String, Int>(16)
  words.forEach { w -> table.put(w, table.find(w).getOrElse(0) + 1) }
  table.find(word).getOrElse(0)
}

countOf(["a", "b", "a"], "a")   // 2
```

If `countOf` returned the table instead, it would need `@Mutating`.

## Using OCaml packages

To call a library installed with [opam](https://opam.ocaml.org), list its package in your kiln
build. kiln then compiles and links your program with it:

```fckt no-check
// build.fk
import uk.m4xy.kiln.fckt.*

module WithStr : FcktConfiguration {
  layout(): FcktLayout = FcktLayout(ocamlPackages = ["str"])
}

project = Project(name = "words", version = "0.1.0")

plugins = [Fckt(WithStr)]
```

```fckt
// src/main.fk
import fckt.io.Console

external String.words(): List<String> = "Str.split (Str.regexp \"[ \\t]+\") this"

main() = println("${"pure   functional code".words()}")
```

```
$ kiln run
> Task :compile
> Task :run
[pure, functional, code]
BUILD SUCCESSFUL
```

When you publish a library that uses OCaml packages, kiln records them with it. Programs that use
your library are linked with those packages without listing them again.
