---
layout: home

hero:
  name: fckt
  text: Kotlin's syntax. Functional all the way down.
  tagline: A statically typed functional language that compiles to readable OCaml, with every effect a function has written in its type.
  image:
    light: /mark.svg
    dark: /mark-dark.svg
    alt: fckt
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Basic syntax
      link: /basic-syntax

features:
  - title: Familiar syntax
    details: Records, types with cases, pattern matching, string templates, trailing lambdas and extension functions, in a syntax that reads like Kotlin. Every binding is immutable.
  - title: Effects in the type
    details: A function says what it does besides work out its result, such as @Console or @Fail. One that says nothing is pure, and the compiler holds it to that.
  - title: Handlers, not mocks
    details: Effects such as Console, Clock and FileSystem are answered by whatever handles them. A test handles them itself, so code that does I/O is tested without any.
  - title: Modules, specs and functors
    details: Group code into modules. A spec says what a module must define, and a functor builds a module from other modules.
  - title: Compiles to OCaml
    details: The output is plain OCaml 5, which ocamlopt turns into a native program. fckt's own compiler is written in fckt and compiles itself.
  - title: Built with kiln
    details: Projects, tests and libraries are built with kiln, a build tool whose build scripts, like the tool itself, are written in fckt.
---
