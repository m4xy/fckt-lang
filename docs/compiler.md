# The compiler

Most of the time, kiln runs the compiler for you. This page is for when you want to run `fckt`
yourself: to compile a single file, to see what it produces, or to build something kiln doesn't.

fckt compiles your code to OCaml. You'll need OCaml 5.1 or newer to run what it produces.

## Compile a program

Give `fckt` the file with your `main` in it:

```sh
fckt main.fk                         # writes main.ml
ocaml -I +unix unix.cma main.ml      # runs it, with OCaml's unix library
```

By default the output goes next to the input, with a `.ml` extension. Use `-o` to choose another
file, or `-o -` to print it instead:

```sh
fckt main.fk -o out.ml
fckt main.fk -o -
```

A program that uses `fckt.io` to work with files or other programs needs OCaml's `unix` library
when it runs:

```sh
ocaml -I +unix unix.cma main.ml
```

To build a native executable instead, use `ocamlopt`:

```sh
ocamlopt -I +unix unix.cmxa main.ml -o main
```

## Packages

The folders next to your program are its packages: `geometry/Shapes.fk` is the module `Shapes` in
the package `geometry`. To use packages from another folder, add it with `-I`:

```sh
fckt app/main.fk -I shared
```

`--other-project <dir>` adds a folder the same way, but treats it as another project's code. Your
program then can't see anything in it that's marked `internal`.

## Version and standard library

```sh
fckt --version        # fckt 0.1.0-SNAPSHOT (build f0d9ebb4b80c)
fckt --std-path       # where the standard library's source is
```

Code compiled by one build of fckt can't be linked with code compiled by another, so the version
includes the build.

## Compiling separately

Normally, everything your program uses ends up in its one `.ml` file: the parts of the language
core it needs, the standard library, and your packages. For bigger projects, you can compile
libraries once and link programs against them. This is what kiln does.

There are four steps.

1. Compile the core:

   ```sh
   fckt --core -o fckt_core.ml
   ```

2. Compile the standard library as a library. `--library std` writes its interface to a folder
   called `std`, and `--no-std` stops the compiler adding the standard library's source a second
   time:

   ```sh
   fckt --library std -o fckt_std.ml --no-std -I "$(fckt --std-path)" \
     fckt.collections fckt.concurrent fckt.effects fckt.io fckt.monads fckt.text fckt.time fckt.values
   ```

3. Compile your own library the same way, checked against the standard library's interface with
   `-L`:

   ```sh
   fckt --library geo -o geo.ml --no-std -L std -I src geometry
   ```

   The interface is a folder of `.fki` files. Each holds a file's public declarations, without their
   code:

   ```fckt
   module Shapes {
     type Shape {
       Circle(radius: Float),
       Square(side: Float),
     }
     area(shape: Shape): Float
   }
   ```

4. Compile the program against both interfaces, then link everything:

   ```sh
   fckt app/main.fk --no-std -L std -L geo -o main.ml
   ocamlopt -I +unix unix.cmxa fckt_core.ml fckt_std.ml geo.ml main.ml -o main
   ```

`-L` implies `--separate`, which links the program with the core you compiled in step 1 instead of
copying the core into the program. Use `--separate` on its own if you want that without any
libraries.

Because programs are checked against a library's interface, write out the type of every public
function and value in a library.

## Symbols

`fckt --symbols` checks a project and writes out what its packages declare: each type, its fields,
its cases and its annotations. It's meant for tools that generate code from your types, such as
serializers. Give it a file to write to, or `-` for the terminal:

```sh
fckt --symbols - -I src geometry
```

```
fckt-symbols 1
cases geometry.Shapes.Shape
  at 2 3 src/geometry/Shapes.fk
  case Circle
    at 3 5 src/geometry/Shapes.fk
    field radius Float
  case Square
    at 4 5 src/geometry/Shapes.fk
    field side Float
```

The first line is the format's version. Each line below it describes one thing, indented under what
it belongs to. Leave out the package names to get every package in the `-I` folders.

## Tests

`fckt --test` compiles a folder of tests into one program that runs them. You name the annotation
that marks a test, and the module that runs them:

```sh
fckt --test test --marker uk.m4xy.fktests.api.Test --runner uk.m4xy.fktests.runner.Runner -I src
```

`--fixtures uk.m4xy.fktests.api.Fixtures` runs each test inside the fixtures listed on it. fk-tests'
kiln plugin passes all of this for you, as [Testing](/testing) describes.
