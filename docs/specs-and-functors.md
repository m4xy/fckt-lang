# Specs and functors

A spec describes what a module must provide: which types, which values and which functions. Specs
let you write code that works with any module that provides those things, and swap one module for
another without changing that code. Functors take this further: they build new modules out of
modules you give them.

## Specs

Here's a spec for a counter. It has a type, a starting value, and two functions:

```fckt
spec Counter {
  type T
  zero: T
  inc(c: T): T
  count(c: T): Int
}
```

A module follows a spec by naming it after a colon, and defines everything the spec lists. Here are two counters that store their count in different ways:

```fckt
module Tally : Counter {
  opaque type T = Int
  zero = 0
  inc(c: Int) = c + 1
  count(c: Int) = c
}

module Clicks : Counter {
  opaque type T(clicks: List<String>)
  zero = T([])
  inc(c: T) = T(["click", *c.clicks])
  count(c: T) = c.clicks.size
}

three = Tally.zero |> Tally.inc |> Tally.inc |> Tally.inc
Tally.count(three)                                // 3
Clicks.count(Clicks.inc(Clicks.zero))             // 1
```

If a module leaves something out, you get an error:

```
error: Tally doesn't define 'inc', which its spec Counter needs
```

Put each member of a spec on its own line.

### Opaque types

`Tally.T` is declared `opaque`. Inside `Tally` it's an `Int`, but code outside only knows it as a
`Tally.T`. It can hold one and pass it back to `Tally`'s functions, but it can't make one or treat it
as a number:

```fckt
x: Int = Tally.inc(Tally.zero) + 1
```

```
error: '+' can't be applied to Tally.T and Int: there's no operator plus
```

That way, the only counts that exist are the ones `Tally` made. Without `opaque`, other code can
see that the type is an `Int`.

## Specs that build on other specs

A spec can include another spec's members by naming it after a colon. A module that follows the
bigger spec provides everything in both, and can be used wherever either is expected.

A spec's function can also have a body. That body is the default: a module that follows the spec
gets it unless it defines the function itself.

```fckt
spec Named {
  name(): String
}

spec Greeter : Named {
  greet(person: String): String = "Hello, $person. I'm ${name()}."
}

module Robot : Greeter {
  name() = "R2"
}

module Butler : Greeter {
  name() = "Jeeves"
  greet(person: String) = "Good evening, $person."
}

Robot.greet("Ada")                                // Hello, Ada. I'm R2.
Butler.greet("Ada")                               // Good evening, Ada.
```

The standard library's `Monad` spec works this way. A monad is a way of chaining steps, where each
step's result decides how the next one runs, such as stopping at the first `None`. A module that
follows `Monad` defines `pure` and `bind`, and gets `map` and `product` built from them.

## Modules with type parameters

A module can take type parameters, which its functions and types can use. Here's a module that
chains steps that each give a `Result`, for any type of error `E`:

```fckt
module Attempts<E> : Monad {
  type M<A> = Result<A, E>

  pure<A>(x: A): Result<A, E> = Ok(x)

  bind<A, B>(m: Result<A, E>, f: (A) -> Result<B, E>): Result<B, E> = when (m) {
    Ok(x) -> f(x)
    Error(e) -> Error(e)
  }
}
```

The standard library has this module already, as `fckt.monads.Results`.

## Blocks that chain steps

When a module has `pure` and `bind`, you can put its name in front of a block. Inside the block,
`x by step` takes the value out of `step`. If a step fails, the block stops there and gives back
that failure. The block's last line is the result:

```fckt
import fckt.monads.Results

positive(n: Int): Result<Int, String> = if (n > 0) Ok(n) else Error("$n isn't positive")

divide(a: Int, b: Int): Result<Int, String> = Results {
  x by positive(a)
  y by positive(b)
  x / y
}

divide(8, 4)                                      // Ok(2)
divide(-1, 4)                                     // Error(-1 isn't positive)
```

`fckt.monads.Options` does the same for `Option`, stopping at the first `None`.

### Collecting every error

Sometimes you don't want to stop at the first problem. When you check a form, you want to tell the
user everything that's wrong with it at once. For that, use a module with `map` and `product`
instead of `bind`, such as `Validated`. Its `by` lines all run, and the errors from every failed
step are kept:

```fckt
import fckt.monads.Validated
import fckt.monads.Validation

type User(name: String, age: Int)

checkName(name: String): Validation<String, String> =
  if (name == "") Invalid(["name is empty"]) else Valid(name)

checkAge(age: Int): Validation<Int, String> =
  if (age < 0) Invalid(["age $age is negative"]) else Valid(age)

user(name: String, age: Int): Validation<User, String> = Validated {
  n by checkName(name)
  a by checkAge(age)
  User(n, a)
}

user("Ada", 36)       // Valid(value=User(name=Ada, age=36))
user("", -3)          // Invalid(errors=[name is empty, age -3 is negative])
```

Because every step runs, a `by` line in one of these blocks can't use the value from another `by`
line.

## Functors

A functor is a module that takes other modules as parameters. You write it once, and then make as
many modules from it as you need.

Here's a sorted set that works for any type, as long as you tell it how to compare two values:

```fckt
spec Ordered {
  type T
  compare(a: T, b: T): Int
}

module SortedSet(M: Ordered) {
  opaque type Set(items: List<M.T>)

  empty = Set([])

  insert(s: Set, x: M.T): Set = Set(insertInto(s.items, x))

  toList(s: Set) = s.items

  private insertInto(xs: List<M.T>, x: M.T): List<M.T> = when (xs) {
    [] -> [x]
    [y, *rest] -> {
      c = M.compare(x, y)
      if (c < 0) [x, *xs] else if (c == 0) xs else [y, *insertInto(rest, x)]
    }
  }
}
```

Inside `SortedSet`, `M` could be any module that follows `Ordered`, so the code can only use what
`Ordered` lists: the type `M.T` and `M.compare`.

To make a set module, apply the functor to a module:

```fckt
module IntOrder : Ordered {
  type T = Int
  compare(a: Int, b: Int) = a - b
}

module ByLength : Ordered {
  type T = String
  compare(a: String, b: String) = a.length - b.length
}

module IntSet = SortedSet(IntOrder)
module WordSet = SortedSet(ByLength)

IntSet.toList([5, 1, 3, 1].fold(IntSet.empty, IntSet.insert))
// [1, 3, 5]

WordSet.toList(["fig", "apple", "kiwi", "pear"].fold(WordSet.empty, WordSet.insert))
// [fig, kiwi, apple]
```

`WordSet` treats words of the same length as equal, so it keeps only the first word of each length.

### Default module parameters

A functor's parameters can have defaults. When you apply it, you can leave those out, or pass
modules by parameter name:

```fckt
spec Shout { shout(s: String): String }
spec Greeting { hello(name: String): String }

module Plain : Shout { shout(s: String) = s }
module Loud : Shout { shout(s: String) = s.uppercase() + "!" }
module English : Greeting { hello(name: String) = "Hello, $name" }
module French : Greeting { hello(name: String) = "Bonjour, $name" }

module Greeter(S: Shout = Plain, G: Greeting = English) {
  greet(name: String) = S.shout(G.hello(name))
}

module Default = Greeter()
module Polite = Greeter(G = French)
module Rowdy = Greeter(Loud)

Default.greet("Ada")      // Hello, Ada
Polite.greet("Ada")       // Bonjour, Ada
Rowdy.greet("Ada")        // HELLO, ADA!
```

### Saying what a parameter's types are

Inside a functor, a parameter's types are normally unknown. If the functor needs to know one, give
the spec type arguments. `Monad<Option>` means "a `Monad` whose `M<A>` is `Option<A>`", so inside
the functor, `M`'s values are plain options:

```fckt
import fckt.monads.Options

module Twice(M: Monad<Option>) {
  both(a: Option<Int>, b: Option<Int>): Option<Int> = M {
    x by a
    y by b
    x + y
  }
}

module OptionMaths = Twice(Options)

OptionMaths.both(Some(1), Some(2))     // Some(3)
OptionMaths.both(Some(1), None)        // None
```

## Modules as values

A spec is also a type, and a module that follows it is a value of that type. You can keep modules
in a list, pass them to functions, and choose one while the program runs:

```fckt
spec Plugin {
  name(): String
  tasks(): List<String>
}

module Docs : Plugin {
  name() = "docs"
  tasks() = ["build docs"]
}

spec Reporting { level(): String }
module Everything : Reporting { level() = "all" }
module Quiet : Reporting { level() = "failures" }

module Tests(R: Reporting = Everything) : Plugin {
  name() = "tests"
  tasks() = ["run tests, reporting ${R.level()}"]
}

plugins: List<Plugin> = [Docs, Tests(R = Quiet), Tests()]

plugins.forEach { p -> println("${p.name()}: ${p.tasks()}") }
// docs: [build docs]
// tests: [run tests, reporting failures]
// tests: [run tests, reporting all]
```

A functor that follows a spec, like `Tests`, makes a new value each time you call it. A value of a
spec only has what the spec lists, so the list can hold modules that have nothing else in common.

### Specs with their own types

When a spec has a type of its own, a function that takes one of its values can refer to that type
through the value. Here, `format.T` is whatever type `format` writes and reads, so `readsBack` works
with any format:

```fckt
spec Format {
  type T
  write(value: T): String
  read(text: String): Option<T>
}

module IntText : Format {
  type T = Int
  write(value: Int) = "$value"
  read(text: String) = text.toIntOrNone()
}

readsBack(format: Format, value: format.T): Boolean = format.read(format.write(value)) == Some(value)

readsBack(IntText, 42)    // true
```

A parameter's type can only mention parameters that come before it. The return type can mention
any of them: `parse(format: Format, text: String): Option<format.T>`.

To accept only formats for one type, name the type in angle brackets. Inside `total`, the values
`format` reads are `Int`s, so they can be added up:

```fckt
total(format: Format<T = Int>, texts: List<String>): Int =
  texts.map { format.read(it).getOrElse(0) }.sum()

total(IntText, ["1", "2", "x"])    // 3
```

This is also how you write the type when there's no value to reach it through, such as a list of
formats: `List<Format<T = Int>>`. If a spec has several types, name only the ones you want to fix,
in any order.

A spec's types can't take type parameters when you use it as a value like this.
