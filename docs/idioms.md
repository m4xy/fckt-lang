# Idioms

Short recipes for things you'll do often in fckt. Every example on this page compiles and runs as
written, as long as you include the imports it shows.

## Create data types

```fckt
type Customer(name: String, email: String, tier: String = "standard")
```

This gives you a `Customer` with three fields. You can compare two customers with `==`, make
changed copies with `copy`, and print one in a string template. Because `tier` has a default, you
can leave it out: `Customer("Ada", "ada@example.com")`.

## Change a copy, not the original

Values don't change once they're made. To get one with a different field, copy it:

```fckt
type Point(x: Int, y: Int)

p = Point(1, 2)
p.copy(y = 5)                   // Point(x=1, y=5)
p                               // Point(x=1, y=2)
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

## Add functions to existing types

You can add a function to a type you didn't write, and call it as if it were built in. These are
called extension functions. Leave out the parentheses to make a property instead:

```fckt
List<A>.second(): Option<A> = when (this) {
  [_, x, *_] -> Some(x)
  else -> None
}

String.shout: String = this.uppercase()

[1, 2, 3].second()              // Some(2)
"fckt".shout                    // FCKT
```

Inside the function, `this` is the value it was called on.

## Use operators with your own types

To let `+` work on your type, define `plus` and mark it `operator`:

```fckt
type Money(Int)
operator Money.plus(other: Money): Money = Money(this.value + other.value)

Money(2) + Money(3)             // Money(value=5)
```

The same works for `-` (`minus`), `*` (`times`), `/` (`div`) and `%` (`rem`).

## Handle a missing value

```fckt
"42".toIntOrNone()              // Some(42)
"old".toIntOrNone()             // None
names: List<String> = []
names.firstOrNone().getOrElse("nobody")   // nobody
```

`getOrElse` gives you the value if there is one, and the fallback if there isn't.

## Chain steps that might fail

Say you have several steps, and each one might give `None`. Instead of checking after every step,
put the steps in an `Options` block. `by` takes the value out of each step, and if any step gives
`None`, the whole block stops and gives `None`:

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

You can do the same with your own types, by writing a module with `bind` and `pure` functions, as
[Specs and functors](/specs-and-functors#blocks-that-chain-steps) explains.

## Fail, and catch the failure

Call `fail` when something has gone wrong and the function can't continue. Its caller can catch the
failure with `attempt`, which turns it into a `Result`:

```fckt
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail checkedAge(n: Int): Int = if (n < 0) fail("negative age: $n") else n

attempt { checkedAge(30) }      // Ok(30)
attempt { checkedAge(-1) }      // Error(negative age: -1)
```

The `@Fail` on `checkedAge` tells callers that it might fail. If nothing catches a failure, the
program stops and prints the reason.

## Describe what a module provides

A spec lists the functions a module must have. Any module that follows the spec can be used where
the spec is expected:

```fckt
spec Greeting { greet(name: String): String }

module English : Greeting { greet(name: String) = "Hello, $name" }
module French : Greeting { greet(name: String) = "Bonjour, $name" }

greetAll(greeting: Greeting, names: List<String>) = names.map { greeting.greet(it) }

greetAll(French, ["Ada", "Alan"])   // [Bonjour, Ada, Bonjour, Alan]
```

Modules are values, so you can pass them to functions, keep them in lists, or pick one while the
program runs.

## Test code that does I/O

Printing goes through the `Console` effect, so you can run a function with your own `Console` that
records each line instead of printing it:

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

`captured` doesn't declare `@Console`, because it handles the effect itself.

## Compute something only when needed

```fckt
expensive = lazy(~(1..1000).sum())
expensive.value                 // 500500
```

The sum isn't worked out until you first read `expensive.value`. After that, the result is reused.
