# Effects

The `fckt.effects` package has two [effects](/effects) that many programs use: one for stopping
with a reason, and one for producing values one at a time.

| Import | What it's for |
| --- | --- |
| `fckt.effects.Fail` | The `@Fail` effect, with `fail(reason)` |
| `fckt.effects.Failure.*` | `attempt { ... }`, which catches a failure as a `Result` |
| `fckt.effects.Yielding` | The `@Yielding<A>` effect, with `yield(value)` |
| `fckt.effects.Generators.*` | `sequence { ... }`, which turns what's yielded into a stream |

## Failing

`fail(reason)` stops what's running and reports why. A function that can fail says so with `@Fail`:

```fckt
import fckt.effects.Fail

@Fail divide(a: Int, b: Int): Int = if (b == 0) fail("can't divide $a by zero") else a / b
```

`fail` never gives back a value, so you can use it anywhere a value is expected, as the `if` above
does.

To catch a failure, run the code inside `attempt`. You get `Ok` with the result if nothing failed,
or `Error` with the reason if something did:

```fckt
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail divide(a: Int, b: Int): Int = if (b == 0) fail("can't divide $a by zero") else a / b

attempt { divide(10, 2) }       // Ok(5)
attempt { divide(10, 0) }       // Error(can't divide 10 by zero)
```

`attempt` handles `@Fail`, so code that calls it doesn't need `@Fail` itself.

If nothing catches a failure, it reaches `main`. The program then stops, prints the reason to
standard error, and exits with code 1.

### Failing or giving a Result

`fail` and `Result` both describe something going wrong. A `Result` makes every caller deal with
the error straight away. `fail` lets the error pass up through any number of calls until something
catches it, which suits errors that only the top of the program can do anything about.

Many functions in the standard library fail rather than give a `Result`. Reading a file that isn't
there is one:

```fckt
import fckt.io.Paths.*
import fckt.io.Files.*
import fckt.effects.Failure.*

attempt { path("missing.txt").readText() }   // Error(missing.txt: No such file or directory)
```

You can go the other way too. To fail on a `Result`'s error, check it with `when`:

```fckt
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail orFail<A>(result: Result<A, String>): A = when (result) {
  Ok(value) -> value
  Error(reason) -> fail(reason)
}

attempt { orFail(Ok(3)) + 1 }   // Ok(4)
```

## Generators

A generator produces values one at a time, and only works each one out when it's asked for. You
write one as an ordinary function that calls `yield` for each value. `sequence` runs it and gives
you a [stream](/standard-library/collections#streams) of what it yields:

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

`naturals` would count forever. Each time the stream is read one step further, the generator runs
until its next `yield` and then waits. `take(5)` only reads five values, so the generator only runs
that far.

A generator can keep whatever state it needs in its parameters. This one yields the Fibonacci
numbers:

```fckt
import fckt.effects.Generators.*
import fckt.effects.Yielding
import fckt.collections.Streams.*

@Yielding<Int> fibonacci(a: Int, b: Int): Unit = {
  yield(a)
  fibonacci(b, a + b)
}

sequence { fibonacci(0, 1) }.take(10)   // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

A generator can also stop. When the function returns, the stream ends. Here `yield` is called from
inside a loop over a list:

```fckt
import fckt.effects.Generators.*
import fckt.effects.Yielding
import fckt.collections.Streams.*

@Yielding<String> lines(names: List<String>): Unit = names.forEach { yield("Hello, $it") }

sequence { lines(["Ada", "Alan"]) }.take(10)   // [Hello, Ada, Hello, Alan]
```

`take(10)` asks for ten values, but the generator only has two.
