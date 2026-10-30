# Handlers

When a function calls an effect's operation, such as `now()` or `println`, something has to answer
it. That's a handler. The function says what it needs, and the code that runs it decides how it's
done. This page shows the ways to write one.

The examples use this effect, from [Effects](/effects#effects-with-operations):

```fckt
effect Clock { now(): Int }

@Clock stamped(message: String) = "[${now()}] $message"
```

## Handling with functions

Write the effect's name, give a function for each operation, and then the block to run:

```fckt
Clock(now = ~42) { stamped("ready") }   // [42] ready
```

Every `now()` called inside the block, however deep, gets its answer from this handler.

## Handling with a module

A [module that follows the effect's spec](/specs-and-functors) can handle it too. An effect's
operations make up its spec. Put the block straight after the
module's name:

```fckt
module FixedClock : Clock {
  now() = 1700000000
}

FixedClock { stamped("ready") }        // [1700000000] ready
```

`Console` works the same way. The standard library's `Terminal` module prints to the real terminal.
Here's one that prints nothing:

```fckt
module Silent : Console {
  print(s: String) = Unit
  println(s: String) = Unit
  readLine() = ""
}
```

## Handlers are values

You can store a handler in a variable and choose it while the program runs:

```fckt
import fckt.io.Terminal

main(args: List<String>) = {
  console = if (args.contains("--quiet")) Silent else Terminal
  console { println("from the terminal") }
}
```

With `--quiet`, the line isn't printed.

## Handling an effect removes it

Once a block's effect is handled, the code around it no longer has that effect. This function runs
`greet`, which reads and prints, but it handles `Console` itself, so it's pure:

```fckt
@Console greet() = {
  name = readLine()
  println("Hello, $name")
}

greeted(name: String): List<String> = {
  var printed: List<String> = []
  Console(print = s -> Unit, println = line -> { printed = printed + [line] }, readLine = ~name) {
    greet()
  }
  printed
}

greeted("Ada")                  // [Hello, Ada]
```

This is how you test code that does I/O: run it inside a handler that records what it does.

## Handlers inside handlers

A handler can use the same effect it's handling. Its calls go to the handler outside it. This one
adds `> ` to every line and passes it on:

```fckt
@Console shouted() =
  Console(
    print = print,
    println = line -> println("> $line"),
    readLine = readLine,
  ) {
    greet()
  }
```

If the user types `Grace`, it prints `> Hello, Grace`.

## Resuming

A function in a handler can take one more parameter, usually called `resume`. It's the rest of the
block, paused at the point where the operation was called. Calling `resume` with an answer carries
on from there:

```fckt
import fckt.io.Console

effect Ask { ask(question: String): String }

@Ask interview() = "${ask("name")}, ${ask("job")}"

@Console logged(): String = Ask(ask = (question, resume) -> {
  println("asked for $question")
  resume("<$question>")
}) { interview() }
```

```
asked for name
asked for job
<name>, <job>
```

`resume` gives back whatever the block gives back, and that's what the handler gives back too. You
can call `resume` straight away, later, or not at all, but at most once. The next sections show what
each of those is good for.

### Stopping early

If the handler doesn't call `resume`, the rest of the block never runs. The block stops, and the
handler's value is the result. This is how `Fail` works:

```fckt
import fckt.effects.Fail

@Fail entry(line: String): (String, String) = when (line.split("=")) {
  [key, value] -> (key, value)
  else -> fail("no '=' in '$line'")
}

parse(lines: List<String>): Result<List<(String, String)>, String> =
  Fail(fail = (reason, resume) -> Error(reason)) { Ok(lines.map(entry)) }

parse(["a=1", "b=2"])           // Ok([(a, 1), (b, 2)])
parse(["a=1", "oops", "c"])     // Error(no '=' in 'oops')
```

The first failing line ends the whole block, so you don't have to pass errors up by hand. The standard
library's `attempt` is this handler.

`fail` returns `Nothing`, a type with no values, so it can never be resumed. If you try, you get an error:

```
error: type mismatch: expected Nothing but found Int
```

Because `fail(...)` never returns, it fits anywhere a value is expected, like the `else` branch
above.

### Resuming later: generators

A handler can keep `resume` and call it later. `sequence` does this to make a lazy stream: each
`yield` pauses the block until someone asks for the next value. This generator never ends, but only
the values you take are worked out:

```fckt
import fckt.effects.Yielding
import fckt.effects.Generators.*
import fckt.collections.Streams.*

@Yielding<Int> naturals(from: Int): Unit = {
  yield(from)
  naturals(from + 1)
}

sequence { naturals(0) }.take(5)   // [0, 1, 2, 3, 4]
```

### Taking turns

The standard library's `fckt.concurrent` uses the same idea to run several tasks that take turns.
`launch` starts a task, `pause` lets the others run, and `join` waits for a task to finish.
`InTurn.run` runs them, one at a time:

```fckt
import fckt.io.Console
import fckt.concurrent.Concurrent
import fckt.concurrent.InTurn

@Concurrent<@Console> @Console worker(name: String) = {
  println("$name: started")
  pause()
  println("$name: finished")
}

main() = InTurn.run {
  a = launch { worker("a") }
  b = launch { worker("b") }
  join(a)
  join(b)
  println("both done")
}
```

```
a: started
b: started
a: finished
b: finished
both done
```

Only one task runs at a time, and it keeps running until it pauses, waits or finishes, so no task
sees another halfway through a change.
