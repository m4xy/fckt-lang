# Effects

An effect is anything a function does apart from returning a value: printing, reading a file,
talking to the network, changing a variable that someone else can see. In fckt, each function lists
the effects it uses, so you can tell what a function might do by reading its declaration.

## Declaring effects

Put an effect's name, with an `@`, before the function's name. `println` uses the `Console` effect,
so a function that calls it has to declare `@Console`:

```fckt
import fckt.io.Console

@Console greet(name: String) = println("Hello, $name")

shout(s: String) = s + "!"
```

`shout` declares nothing, so it's pure: it only works out its result.

Effects carry up through calls. A function that calls `greet` uses `Console` too, so it has to
declare it as well. If it doesn't, you get an error:

```fckt
welcome(name: String) = greet(name)
```

```
error: 'welcome' does @Console, so it must say so: @Console welcome(...)
```

A function can declare effects it doesn't end up using. Its type then records only the ones it does.

## Functions you pass in

`map` and `forEach` take a function, and they use whatever effects that function uses. Mapping a
pure function is pure, and calling a printing function on each item prints:

```fckt
loud(names: List<String>) = names.map(shout)

@Console greetAll(names: List<String>) = names.forEach(greet)
```

```fckt
loud(["a", "b"])                // [a!, b!]
greetAll(["Ada", "Grace"])      // prints Hello, Ada and Hello, Grace
```

## Function types

A function type can list effects too. Here, a `Logger` holds a function that's allowed to print:

```fckt
type Logger(log: @Console (String) -> Unit)

@Console report(logger: Logger, total: Int) = logger.log("total: $total")

report(Logger(println), 3)      // prints total: 3
report(Logger(~Unit), 4)        // prints nothing
```

A pure function fits anywhere a function with effects is expected, which is why `~Unit` works. The
other way round doesn't. A field typed `(String) -> Unit` only accepts pure functions:

```
error: type mismatch: expected (String) -> Unit but found @Console (String) -> Unit
```

Making a function doesn't run it. `greeter` returns a function that prints, but `greeter` itself is
pure:

```fckt
greeter(greeting: String): @Console (String) -> Unit = name -> println("$greeting, $name")
```

## Defining your own effects

### Effects with operations

Most effects you define will have operations: functions that the effect provides. Here, `Clock`
has one operation, `now`:

```fckt
effect Clock { now(): Int }

@Clock stamped(message: String) = "[${now()}] $message"
```

`stamped` calls `now()`, but it doesn't decide what time it is. That's up to whatever handles the
effect. Here, the clock always says 42:

```fckt
Clock(now = ~42) { stamped("ready") }   // [42] ready
```

If nothing handles `Clock`, the program doesn't compile:

```
error: main does @Clock, but nothing handles it: run it in a handler, like Clock(...) { ... }
```

[Handlers](/handlers) covers the different ways to handle an effect.

### Effects that are labels

Some effects have no operations. They're labels that mark what a function does in a way the
compiler can't see for itself, such as calling into code outside fckt through an `external`
declaration:

```fckt
effect Audit

@Audit external audit(entry: String): Unit = "ignore entry"

@Audit transfer(amount: Int): Int = {
  audit("moved $amount")
  amount
}
```

Anything that calls `transfer` now has to declare `@Audit`, so every place that writes to the audit
log is marked.

### Generic effects

An effect can take type parameters. `Emit<A>` sends out values of type `A`, and the declaration on
`countdown` says it emits `Int`s:

```fckt
effect Emit<A> { emit(value: A): Unit }

@Emit<Int> countdown(n: Int): Unit = if (n == 0) Unit else {
  emit(n)
  countdown(n - 1)
}
```

```fckt
var seen: List<Int> = []
Emit(emit = n -> { seen = seen + [n] }) { countdown(3) }
seen                            // [3, 2, 1]
```

## Effect parameters

Sometimes a function runs other functions, and doesn't care what effects they have. Give it an
effect parameter, written with an `@`, in the same place you'd write a type parameter:

```fckt
runAll<@E>(tasks: List<@E () -> Unit>): Unit = tasks.forEach { it() }

runAll([~println("one"), ~println("two")])   // prints one, then two
```

`runAll` uses whatever effects its tasks use, here `@Console`. Types can take effect parameters too,
when they hold functions: `type Queue<@E>(var tasks: List<@E () -> Unit>)`.

## Grouping effects

If several effects often go together, you can give the group a name. Declare an annotation, and put
the effects on it:

```fckt
effect Network

@Network external send(message: String): Unit = "ignore message"

@Console @Network annotation type Io

@Io announce(message: String) = {
  println(message)
  send(message)
}
```

`@Io` means `@Console @Network`, wherever you use it.

## Effects on modules

You can put effects on a module. Every function in it is then limited to those effects. A `@Pure`
module can't contain any function that does anything but compute:

```fckt
@Pure module Pricing {
  total(prices: List<Int>) = {
    println("adding up")
    prices.sum()
  }
}
```

```
error: 'total' does @Console, but it's in Pricing, which may only be pure
```

This is a good way to keep the core of a program, its rules and calculations, separate from the
code that talks to the outside world.

## Hiding what a module does

Say you have a spec for storing notes. One module stores them in memory, another in a database, and
each uses different effects to do it. Code that stores a note shouldn't need to change when you
switch between them.

Mark the spec with an annotation that has `@Encapsulates`. Callers then see only the effects the
annotation lists, whatever the module uses underneath:

```fckt
import fckt.values.Mutable

effect Persistence

@Persistence @Encapsulates annotation type Repository

@Repository
spec Notes {
  add(note: String): Unit
  all(): List<String>
}

module MemoryNotes : Notes {
  notes: Mutable<List<String>> = Mutable([])
  @Mutating add(note: String) = { notes.value = notes.value + [note] }
  @Mutating all() = notes.value
}

@Persistence remember(note: String): List<String> = {
  MemoryNotes.add(note)
  MemoryNotes.all()
}
```

`MemoryNotes` changes a variable, which is `@Mutating`, but `remember` only declares
`@Persistence`. Declaring `@Mutating` instead isn't enough:

```
error: 'remember' does @Persistence, so it must say so: @Persistence remember(...)
```

## main and default handlers

`main` doesn't declare its effects. It can do anything, and each effect it uses is handled before
the program starts. `Console`, for example, is handled by the terminal.

For your own effects, say which handler `main` should use with `@HandledBy`:

```fckt
@HandledBy(FixedClock) effect Clock {
  now(): Int
}

module FixedClock : Clock {
  now() = 1700000000
}

@Clock stamped(message: String) = "[${now()}] $message"

main() = println(stamped("ready"))    // [1700000000] ready
```

An effect without `@HandledBy` has to be handled before `main` reaches it.

## Copies of an effect

Sometimes you need two separate instances of the same effect, such as two stores that should be
handled differently. Declare a copy with `=`. It has the same operations, but it's a different
effect:

```fckt
effect Store {
  load(key: String): String
}

effect Orders = Store
effect Users = Store

@Orders @Users summary(id: String): String = "${Users.load(id)} ordered ${Orders.load(id)}"

summaryFrom(id: String): String = Orders(load = key -> "a book") {
  Users(load = key -> "Ada") { summary(id) }
}

summaryFrom("1")                // Ada ordered a book
```

When more than one effect in scope has an operation with the same name, call it through the effect:
`Users.load(id)`.
