# Coming from Kotlin

If you know Kotlin, most fckt code will look familiar. fckt borrows Kotlin's syntax, but it's a
functional language underneath, so some things work differently. This page goes through them.

## What stays the same

These work much as you'd expect:

- string templates, `if` and `when` as expressions, and `is` checks that narrow a value's type
- trailing lambdas and `it`
- extension functions and properties, and `operator` functions
- default and named arguments
- ranges, and collection functions like `map`, `filter`, `fold`, `sortedBy` and `joinToString`
- `private` and `internal`

A `when` over a type's cases has to handle all of them, just like a `when` over a sealed type.

## What's different

| Kotlin | fckt | |
| --- | --- | --- |
| `val x = 1` | `x = 1` | Every value is immutable, so there's no keyword for it. |
| `var x = 1` | `var x = 1` | Changing a variable is an effect, `@Mutating`, unless the variable never leaves the function. |
| `fun f(x: Int) = ...` | `f(x: Int) = ...` | There's no `fun`. |
| `data class P(val x: Int)` | `type P(x: Int)` | Fields can't change unless you mark them `var`. |
| `sealed interface S` and its subclasses | `type S { A(...), B }` | All the cases are declared together. |
| `enum class Level { DEBUG, INFO }` | `type Level { Debug, Info }` | Use `Level.values` and `level.name`. |
| `x: String?` and `null` | `x: Option<String>` and `None` | There's no `null`. |
| `throw`, `try` and `catch` | `fail(...)`, `attempt { ... }` and `Result` | Failing is an effect, and results are values. |
| `interface` | `spec` | A module follows a spec, the way a class implements an interface. |
| `object` | `module` | A module can follow a spec, and you can pass it around as a value. |
| `println(42)` | `println("${42}")` | `println` only takes a `String`. |
| `Long` | `Int` | fckt's `Int` is already 63 bits, so there's no separate `Long`. |
| `x.let { ... }` | `x \|> f` | `\|>` passes a value to a function. |
| `suspend` and coroutines | effect handlers | Generators, schedulers and async I/O are all built with handlers. |

## What's new

- **Effects.** A function declares what it does to the outside world, like `@Console` or `@Fail`.
  If it declares nothing, it's pure, and the compiler checks that. See
  [Basic syntax](/basic-syntax#effects).
- **Handlers.** Code that uses an effect doesn't decide how it's carried out. In a real program,
  `Console` writes to the terminal. In a test, it can collect lines in a list.
- **Functors.** A module can take other modules as parameters: `module SortedSet(M: Ordered) { ... }`.
- **Blocks that chain steps.** `Options { x by half(n); x + 1 }` stops at the first step that gives
  `None`.
- **Opaque types.** `opaque type T = Int` hides what `T` really is from code outside its module, so
  only that module can create one.

## Where it runs

fckt doesn't run on the JVM. It compiles to OCaml, which compiles to native executables, so Java
libraries aren't available. You can call OCaml code instead, through `external` declarations.
