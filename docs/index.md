---
layout: home

hero:
  name: fckt
  text: Functional all the way down.
  tagline: A statically typed functional language where every function's type tells you what it does to the outside world.
  image:
    light: /mark.svg
    dark: /mark-dark.svg
    alt: fckt
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Why fckt
      link: /why

features:
  - title: Easy to read
    details: Records, pattern matching, string templates and trailing lambdas, in a clean syntax that will look familiar if you've used a C-style language. Values don't change unless you say they can.
  - title: Effects you can see
    details: If a function prints, reads a file or can fail, its declaration says so. If it says nothing, it's pure.
  - title: Tests without mocks
    details: Printing, files and the clock all go through effects. A test can handle them itself, so you can test code that does I/O without touching the disk or the terminal.
  - title: Modules that fit together
    details: Group code into modules. Specs describe what a module provides, and functors build new modules out of existing ones.
  - title: Native programs
    details: fckt programs compile to native executables. The fckt compiler is itself written in fckt.
  - title: A build tool in the same language
    details: kiln builds your projects, runs your tests and publishes libraries. Its build scripts are written in fckt too.
---
