# Get started with fckt

fckt is a functional programming language. You write it in `.fk` files, and the fckt compiler turns
them into programs you can run.

On this page you'll install fckt, run your first program, and set up a project with kiln, fckt's
build tool.

## Install fckt

You'll need:

- **JDK 17 or newer**, to build the compiler.
- **OCaml 5.1 or newer**, to run the programs it produces. On macOS, run `brew install ocaml`. On
  other systems, install it with [opam](https://opam.ocaml.org/doc/Install.html).
- **git**.

fckt is built together with [Kastor](https://github.com/m4xy/kastor), so clone both repositories
into the same folder:

```sh
git clone https://github.com/m4xy/kastor.git
git clone https://github.com/m4xy/fckt.git
cd fckt
./gradlew installDist
export PATH="$PWD/build/install/fckt/bin:$PATH"
```

To check that it worked, ask fckt for its version:

```sh
fckt --version
```

## Hello, world

Create a file called `hello.fk`:

```fckt
import fckt.io.Console

main() = println("Hello, fckt!")
```

Then compile it and run the result:

```sh
fckt hello.fk        # writes hello.ml
ocaml hello.ml
```

```
Hello, fckt!
```

The `import` line gives you `println`, which comes from the standard library's `Console`. You'll
find out why printing needs an import in [Basic syntax](/basic-syntax#effects).

## Create a project

For anything bigger than a single file, use [kiln](https://github.com/m4xy/kiln). It compiles your
code, runs it, runs your tests, and publishes libraries.

### Install kiln

kiln is written in fckt, so it's built with the `fckt` you just installed:

```sh
git clone https://github.com/m4xy/kiln.git
cd kiln
./bootstrap.sh
export PATH="$HOME/.kiln/bin:$PATH"
```

### Set up the project

A kiln project is a folder with a `build.fk` file in it. Make one that looks like this:

```
hello/
├── build.fk
└── src/
    ├── main.fk
    └── greetings/
        └── Greetings.fk
```

`build.fk` describes the project. It's written in fckt as well:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt

project = Project(name = "hello", version = "0.1.0")

plugins = [Fckt()]
```

Each folder inside `src` is a package. Put a module in `src/greetings/Greetings.fk`:

```fckt
// src/greetings/Greetings.fk
module Greetings {
  greet(name: String) = "Hello, $name!"
}
```

`src/main.fk` is where the program starts:

```fckt
// src/main.fk
import fckt.io.Console
import greetings.Greetings

main(args: List<String>) = println(Greetings.greet(args.firstOrNone().getOrElse("world")))
```

### Build and run it

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

Anything after `--` is passed to your program. The compiled program ends up in `build/bin/hello`,
and `kiln tasks` lists everything else kiln can do.

## Editor support

- **IntelliJ IDEA**: the plugin in fckt's `editors/intellij` folder highlights your code, shows
  errors as you type, jumps to definitions, shows inferred types when you hover, and formats code.
- **VS Code**: `editors/vscode` adds syntax highlighting.

[Editor support](/editors) explains how to install them.

## What's next

- [Basic syntax](/basic-syntax) walks through the language one feature at a time.
- [Idioms](/idioms) shows how to do common things.
- The Language pages, starting with [Types](/types), go into each feature in depth.
- [Building with kiln](/kiln) covers projects, dependencies and publishing.
