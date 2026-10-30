# Standard library

fckt comes with a standard library for the things most programs need: collections, text, files,
other programs, time, and running tasks side by side. This page gives an overview of each package
and shows what it's for.

Apart from `fckt.lang`, which every file can use, you import what you need:

```fckt
import fckt.io.Console
import fckt.collections.Maps.*
```

If you use something without importing it, the compiler's error tells you which import to add.

## fckt.lang

`fckt.lang` is always available, so you never import it. It contains:

- the functions on the built-in types: lists, strings, characters, numbers, `Option`, `Result` and
  lazy values. [Collections and text](/collections) covers them.
- `Monad` and `Applicative`, the specs behind blocks such as `Options { ... }`.
- `identity` and `error`.
- the effects the language itself tracks: `@Mutating` for changing state, and `@Pure` for functions
  that do nothing else.
- annotations that change how the compiler treats a declaration, such as `@HandledBy`, which names
  the handler `main` uses for an effect.

## fckt.collections

Maps, sets, arrays and streams. [Collections and text](/collections) shows maps, sets and arrays
in detail.

| Import | What it's for |
| --- | --- |
| `fckt.collections.Maps.*` | `Map<K, V>`: `mapOf`, lookups, `put`, `remove`, `groupBy`, `associateBy` |
| `fckt.collections.Sets.*` | `Set<A>`: `setOf`, `contains`, `union`, `intersect` |
| `fckt.collections.Array`, `fckt.collections.Arrays.*` | Fixed-size arrays you can change in place |
| `fckt.collections.Stream`, `fckt.collections.Streams.*` | Lazy, possibly endless sequences, read with `take` |

## fckt.monads

These modules let you write a series of steps as a block, with `by` taking the value out of each
step. What happens when a step has no value depends on the module.
[Specs and functors](/specs-and-functors#blocks-that-chain-steps) explains how these blocks work.

`Results` stops at the first `Error`:

```fckt
import fckt.monads.Results

parse(s: String): Result<Int, String> = when (s.toIntOrNone()) {
  Some(n) -> Ok(n)
  None -> Error("not a number: $s")
}

Results { a by parse("3"); b by parse("4"); a + b }   // Ok(7)
```

`Validated` runs every step and collects all the errors, which suits checking a form:

```fckt
import fckt.monads.Validated
import fckt.monads.Validation

type User(name: String, age: Int)

checkName(name: String): Validation<String, String> =
  if (name == "") Invalid(["name is empty"]) else Valid(name)
checkAge(age: Int): Validation<Int, String> =
  if (age < 0) Invalid(["age $age is negative"]) else Valid(age)

Validated { n by checkName(""); a by checkAge(-1); User(n, a) }
// Invalid(errors=[name is empty, age -1 is negative])
```

`Lists` tries every combination, and `guard` filters them:

```fckt
import fckt.monads.Lists

Lists { x by [1, 2, 3]; _ by Lists.guard(x > 1); y by ["a", "b"]; (x, y) }
// [(2, a), (2, b), (3, a), (3, b)]
```

`Options` stops at the first `None`. There's an example in [Idioms](/idioms#chain-steps-that-might-fail).

## fckt.effects

### Failing

`fail(reason)` stops the current calculation, and `attempt { ... }` catches a failure as a
`Result`. Both come from `fckt.effects.Fail` and `fckt.effects.Failure`. If nothing catches a
failure, the program stops and prints the reason. See [Idioms](/idioms#fail-and-catch-the-failure).

### Generators

A generator produces values one at a time, only as they're asked for. Write one with `yield`, and
turn it into a stream with `sequence`:

```fckt
import fckt.effects.Generators.*
import fckt.effects.Yielding
import fckt.collections.Streams.*

@Yielding<Int> naturals(from: Int): Unit = {
  yield(from)
  naturals(from + 1)
}

sequence { naturals(0) }.take(5)    // [0, 1, 2, 3, 4]
```

`naturals` would count forever, but `take(5)` only asks for five numbers, so it stops there.

## fckt.io

### Console

`Console` reads and writes the terminal, with `print`, `println` and `readLine`. In a running
program, `main` connects it to the real terminal through the `Terminal` module.

### Paths

A `Path` names a file or folder. The functions in `Paths` work on the path itself and never touch
the disk:

```fckt
import fckt.io.Paths.*

p = path("src//main/./util/../Main.fk")
p                               // Path(value=src/main/Main.fk)
p.name                          // Main.fk
p.extension                     // fk
p.nameWithoutExtension          // Main
p.parent                        // Some(Path(value=src/main))
p.withExtension("ml")           // Path(value=src/main/Main.ml)
"src".toPath().resolve("lib")   // Path(value=src/lib)
path("/a/b/c").relativeTo(path("/a"))   // Some(Path(value=b/c))
```

`path` tidies what you give it, so extra slashes, `.` and `..` are cleaned up.

### Files

`Files` reads and writes the disk. Its functions use the `FileSystem` effect:

```fckt
import fckt.io.Paths.*
import fckt.io.Files.*

dir = path("work")
dir.makeDirs()
notes = dir.resolve("notes.txt")
notes.writeText("first\n")
notes.appendText("second\n")
notes.exists()                  // true
notes.readLines()               // [first, second]
dir.listFiles().map { it.name } // [notes.txt]
```

There's also `readText`, `readBytes`, `writeBytes`, `isDirectory`, `delete`, `copyTo`,
`copyRecursively`, `lastModified` and `canonical`. When something can't be done, such as reading
a file that doesn't exist, the function fails with the reason, which you can catch with `attempt`.

To read or write a file a piece at a time, open it around a block with `reading`, `writing` or
`appending`. Inside the block, `nextLine`, `remainingLines` and `forEachLine` read, and `write` and
`writeLine` write. The file is closed when the block ends, even if it fails.

### Processes

`Processes` runs other programs:

```fckt
import fckt.io.Processes

echoed = Processes.run("echo", ["hello from echo"])
echoed.code                     // 0
echoed.value.trim()             // hello from echo
```

`run` waits for the program to finish and gives you its exit code and everything it printed.
`streaming` lets you read the output line by line while the program runs. `runAttached` runs a
program on your terminal. `env` and `setEnv` read and set environment variables, and `exit` ends
the current program.

## fckt.concurrent

Tasks let parts of a program take turns. `launch` starts a task, `pause` lets the other tasks run,
and `join` waits for a task to finish. `InTurn.run` runs a block and every task it launches, one
at a time, until they've all finished:

```fckt
import fckt.concurrent.*
import fckt.effects.Failure.*
import fckt.values.Mutable

log = Mutable([])
said = (line: String) -> { log.value = log.value + [line] }

attempt {
  InTurn.run {
    a = launch { said("a1"); pause(); said("a2") }
    b = launch { said("b1"); join(a); said("b after a") }
    said("main")
    join(b)
    42
  }
}                               // Ok(42)

log.value                       // [main, a1, b1, a2, b after a]
```

Only one task runs at a time, and it keeps running until it pauses, waits or finishes, so tasks
never see each other halfway through a change. A task can also `park` until another task wakes it
with `wake`. If every task is waiting and nothing can wake any of them, `run` fails and says so.

## fckt.io.Polls

`Polls.running` works like `InTurn.run`, but tasks can also wait for time to pass, or for a file
or connection to be ready, while the others carry on:

```fckt
import fckt.concurrent.*
import fckt.io.Polls
import fckt.io.Polls.*
import fckt.time.Duration

attempt {
  Polls.running {
    launch { sleep(Duration(60)); println("slow") }
    launch { sleep(Duration(10)); println("fast") }
    println("started")
    "slept"
  }
}
```

```
started
fast
slow
```

The result is `Ok(slept)`. Tasks wait with `sleep`, `awaitReadable` and `awaitWritable`.

## fckt.time

`Clock` is the effect for asking the time. `now()` gives an `Instant`, and the gap between two
instants is a `Duration`, both in milliseconds:

```fckt
import fckt.time.Clock
import fckt.time.Instant
import fckt.time.Duration
import fckt.time.Times.*

@Clock elapsed(start: Instant): Duration = start.until(now())

Instant(1000) + Duration(250)   // Instant(millis=1250)
```

In a running program, `main` answers `now()` with the system clock. A test can answer it with a
fixed time instead:

```fckt
Clock(now = ~Instant(5000)) { elapsed(Instant(2000)) }   // Duration(millis=3000)
```

## fckt.text

| Import | What it's for |
| --- | --- |
| `fckt.text.Bytes`, `fckt.text.Encodings.*` | Raw data, and converting between text and bytes. See [Collections and text](/collections#bytes). |
| `fckt.text.Format` | A spec for writing a type as text and reading it back |
| `fckt.text.Digests.*` | `md5()` on strings and bytes |

A `Format` module has `of`, which writes a value as text, and `read`, which turns text back into a
value or an error:

```fckt
import fckt.text.Format

module IntText : Format {
  type T = Int
  of(value: Int): String = "$value"
  read(text: String): Result<Int, String> = when (text.toIntOrNone()) {
    Some(n) -> Ok(n)
    None -> Error("not a number: $text")
  }
}

IntText.of(42)                  // 42
IntText.read("x")               // Error(not a number: x)
```

```fckt
import fckt.text.Digests.*

"hello".md5()                   // 5d41402abc4b2a76b9719d911017c592
```

## fckt.values

`fckt.values.Mutable` holds a single value that can change: `Mutable(0)` makes one, and
`counter.value += 1` changes it. See [Collections and text](/collections#mutable).
