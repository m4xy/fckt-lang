# Get started with fckt

fckt is a functional programming language with Kotlin's syntax. Its source files end in `.fk`, and
the compiler turns them into OCaml, which OCaml's own tools build and run.

This page installs fckt, runs a first program, and sets up a project with kiln, fckt's build tool.

## Install fckt

You need:

- **JDK 17 or newer**, to build the compiler.
- **OCaml 5.1 or newer**, with `ocamlopt`, to run what it produces. On macOS, `brew install ocaml`;
  elsewhere, [opam](https://opam.ocaml.org/doc/Install.html).
- **git**.

fckt's build uses [Kastor](https://github.com/m4xy/kastor) from the folder beside it, so clone both
into the same folder:

```sh
git clone https://github.com/m4xy/kastor.git
git clone https://github.com/m4xy/fckt.git
cd fckt
./gradlew installDist
export PATH="$PWD/build/install/fckt/bin:$PATH"
```

Check that it works:

```sh
fckt --version
```

## Hello, world

Create a file called `hello.fk`:

```fckt
import fckt.io.Console

main() = println("Hello, fckt!")
```

Compile it to OCaml and run it:

```sh
fckt hello.fk        # writes hello.ml
ocaml hello.ml
```

```
Hello, fckt!
```

`println` comes from the standard library's `Console` effect, which is why the file imports it. A
program can print, read files, or run other programs only through effects like this one; the
[basic syntax](/basic-syntax#effects) page says more.

## Create a project

For anything bigger than one file, use [kiln](https://github.com/m4xy/kiln). It compiles a
project's packages, runs it, runs its tests and publishes it as a library.

### Install kiln

kiln is written in fckt, so the first build needs the `fckt` you just installed:

```sh
git clone https://github.com/m4xy/kiln.git
cd kiln
./bootstrap.sh
export PATH="$HOME/.kiln/bin:$PATH"
```

### Lay out the project

A project is a folder with a `build.fk`, which is itself fckt:

```
hello/
├── build.fk
└── src/
    ├── main.fk
    └── greetings/
        └── Greetings.fk
```

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt

project = Project(name = "hello", version = "0.1.0")

plugins = [Fckt()]
```

Each folder under `src` is a package. A file with a capitalised name declares one thing, named as
the file is:

```fckt
// src/greetings/Greetings.fk
module Greetings {
  greet(name: String) = "Hello, $name!"
}
```

`src/main.fk` is the program:

```fckt
// src/main.fk
import fckt.io.Console
import greetings.Greetings

main(args: List<String>) = println(Greetings.greet(args.firstOrNone().getOrElse("world")))
```

### Build and run

```sh
kiln build
kiln run -- fckt
```

```
> Task :compile
> Task :check
> Task :build
BUILD SUCCESSFUL
> Task :run
Hello, fckt!
BUILD SUCCESSFUL
```

The program is a native executable at `build/bin/hello`. `kiln tasks` lists everything else kiln
can do.

## Editor support

- **IntelliJ IDEA**: the plugin in fckt's `editors/intellij` colours each name by what it is, shows
  the compiler's errors as you type, goes to declarations, shows inferred types on hover and
  formats code.
- **VS Code**: `editors/vscode` has syntax highlighting.

Each folder's README says how to install it.

## What's next

- [Basic syntax](/basic-syntax): a tour of the language, a construct at a time.
- [Idioms](/idioms): common things, written the fckt way.
- [Coming from Kotlin](/coming-from-kotlin): what's the same and what isn't.
