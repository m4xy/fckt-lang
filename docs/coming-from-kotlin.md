# Coming from Kotlin

fckt keeps Kotlin's syntax wherever Kotlin's meaning fits a functional language, and changes it
where it doesn't. This page lists the differences.

## The same, or nearly

- Records and their `copy`, string templates, `when`, `is` narrowing, trailing lambdas and `it`,
  extension functions and properties, `operator` functions, default and named arguments, ranges,
  method chains, and `internal` and `private`.
- `if` and `when` are expressions. A `when` over a type's cases must cover all of them, as over a
  sealed type in Kotlin.
- Values print like Kotlin's `toString()`: `Point(x=1, y=2)`.
- Lists, `map`, `filter`, `fold`, `sortedBy`, `joinToString` and most of the collection functions
  you know.

## Different

| Kotlin | fckt | |
| --- | --- | --- |
| `val x = 1` | `x = 1` | Every binding is immutable, so there's no keyword. |
| `var x = 1` | `var x = 1` | Changing it is the `@Mutating` effect, unless the variable never leaves the function. |
| `fun f(x: Int) = ...` | `f(x: Int) = ...` | No `fun`. |
| `data class P(val x: Int)` | `type P(x: Int)` | Fields are immutable unless marked `var`. |
| `sealed interface S` with subclasses | `type S { A(...), B }` | Cases are declared together, in one place. |
| `enum class Level { DEBUG, INFO }` | `type Level { Debug, Info }` | Cases that carry nothing; `Level.values`, `level.name`. |
| `x: String?`, `null` | `x: Option<String>`, `None` | There is no `null`. |
| `throw`, `try`/`catch` | `fail(...)`, `attempt { ... }`, `Result` | Failure is an effect, or a value. |
| `interface` | `spec` | A module follows a spec. Specs can have defaults, and functors take modules as parameters. |
| `object` | `module` | A group of declarations, which can follow a spec and be passed as a value. |
| `println(42)` | `println("${42}")` | `println` takes a `String`. |
| `Long` | `Int` | An `Int` is 63 bits, as OCaml's is. There's no separate `Long`. |
| `x.let { ... }` | `x \|> f` | The pipe passes a value to a function. |
| `suspend`, coroutines | effect handlers | A handler's `resume` gives generators, schedulers and async I/O. |

## New

- **Effects in types.** `@Console`, `@Fail`, `@Mutating` and your own say what a function does. A
  function that declares none is pure, and the compiler checks it. See
  [Basic syntax](/basic-syntax#effects).
- **Handlers.** An effect's operations are answered by whatever handles them: the terminal in
  `main`, a list in a test.
- **Functors.** A module that takes modules: `module SortedSet(M: Ordered) { ... }`.
- **Monadic blocks.** `Options { x by half(n); x + 1 }` runs a block through a module's `bind`.
- **Opaque types.** `opaque type T = Int` hides what a type is outside its module, so only the
  module can make one.

## Where it runs

fckt compiles to OCaml, not to the JVM. Programs are native executables built by `ocamlopt`, and
Java libraries aren't available; OCaml code is, through `external` declarations.
