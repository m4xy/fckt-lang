# Idioms

A collection of frequently used idioms in fckt. Every example on this page compiles and runs as
written, with the imports it shows.

## Create data types

```fckt
type Customer(name: String, email: String, tier: String = "standard")
```

A `Customer` has its fields, `copy`, equality, and a readable form in string templates. Fields with defaults can be
left out: `Customer("Ada", "ada@example.com")`.

## Change a copy, not the original

```fckt
p = Point(1, 2)
moved = p.copy(y = 5)           // Point(x=1, y=5); p is unchanged
```

## Filter, map and sort a list

```fckt
words = ["kiln", "fckt", "ocaml"]
words.filter { it.length > 4 }
words.sortedBy { it.length }.joinToString(", ")   // kiln, fckt, ocaml
```

## Build a map from a list

```fckt
import fckt.collections.Maps.*

words.associateWith { it.length }   // {fckt=4, kiln=4, ocaml=5}
```

## Extension functions and properties

Add a function to a type without touching it:

```fckt
List<A>.second(): Option<A> = when (this) {
  [_, x, *_] -> Some(x)
  else -> None
}

String.shout: String = this.uppercase()

[1, 2, 3].second()              // Some(2)
"fckt".shout                    // FCKT
```

## Operators for your own types

```fckt
type Money(Int)
operator Money.plus(other: Money): Money = Money(this.value + other.value)

Money(2) + Money(3)             // Money(value=5)
```

Only an extension marked `operator` is used for an operator.

## Handle a missing value

```fckt
"42".toIntOrNone()              // Some(42)
"old".toIntOrNone()             // None
names.firstOrNone().getOrElse("nobody")
```

## Chain steps that might give nothing

A module's name before a block runs the block through the module's `bind`. `by` takes the value
out, or stops the whole block:

```fckt
import fckt.monads.Options

half(n: Int): Option<Int> = if (n % 2 == 0) Some(n / 2) else None

quarter(n: Int): Option<Int> = Options {
  h by half(n)
  q by half(h)
  q
}

quarter(12)                     // Some(3)
quarter(6)                      // None
```

The same works for any module with `bind` and `pure`, including your own.

## Fail, and catch the failure

`fail` is an operation of the `Fail` effect. `attempt` handles it, turning the block into a
`Result`:

```fckt
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail checkedAge(n: Int): Int = if (n < 0) fail("negative age: $n") else n

attempt { checkedAge(30) }      // Ok(30)
attempt { checkedAge(-1) }      // Error(negative age: -1)
```

Left unhandled, a failure in `main` stops the program with the reason on standard error.

## Describe what a module provides

A spec says what a module must define. Any module that follows it can be used where the spec is
expected:

```fckt
spec Greeting { greet(name: String): String }

module English : Greeting { greet(name: String) = "Hello, $name" }
module French : Greeting { greet(name: String) = "Bonjour, $name" }

greetAll(greeting: Greeting, names: List<String>) = names.map { greeting.greet(it) }

greetAll(French, ["Ada", "Alan"])   // [Bonjour, Ada, Bonjour, Alan]
```

A module is a value of its spec, so it can be passed, stored in a list, or chosen at runtime.

## Test code that does I/O

`Console` is an effect, so a function that prints can be run with a handler that collects what it
prints instead:

```fckt
import fckt.io.Console

@Console report(lines: List<String>) = lines.forEach(println)

captured(): List<String> = {
  var seen: List<String> = []
  Console(print = line -> { seen = seen + [line] }, println = line -> { seen = seen + [line] }, readLine = ~"") {
    report(["one", "two"])
  }
  seen
}

captured()                      // [one, two]
```

Handling `Console` takes the effect away, so `captured` is pure: it declares no effects, and the
compiler agrees.

## Compute something only when needed

```fckt
expensive = lazy(~(1..1000).sum())
expensive.value                 // 500500, worked out the first time it's read
```
