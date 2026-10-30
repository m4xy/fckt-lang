# Standard library

fckt comes with a standard library for the things most programs need: collections, text, files,
other programs, time, and running tasks side by side. These pages go through it a package at a time
and show what each part is for.

## Importing

Apart from `fckt.lang`, which every file can use, you import what you need. You can import one
thing by name, or everything in a module with `.*`:

```fckt
import fckt.io.Console
import fckt.collections.Maps.*

main() = println("${mapOf([("one", 1), ("two", 2)])}")
```

If you use something without importing it, the compiler's error tells you which import to add:

```
error: unknown name 'mapOf'; import fckt.collections.Maps.mapOf has one
```

## fckt.lang

`fckt.lang` is always available, so you never import it. It holds:

- the functions on the built-in types: lists, strings, characters, numbers, `Option`, `Result` and
  lazy values. [Collections and text](/collections) covers them.
- maths: `max`, `min`, `abs`, `sqrt`, `exp`, `log`, `floor`, `ceil`, and `sin`, `cos`, `tan` with
  their inverses. Numbers convert with `toFloat`, `toInt` and `toByte`.
- `identity`, which gives back what it's given, and `error`, which stops the program with a
  message. Use `error` only for things that can't happen. For a failure that a caller should be
  able to handle, use [`fail`](/standard-library/effects#failing).
- `lazy`, which makes a value that's worked out the first time you read it.
- `Monad` and `Applicative`, the specs behind blocks such as `Options { ... }`. See
  [Option and Result](/standard-library/option-and-result#blocks-of-steps).
- the effects the language itself tracks: `@Mutating` for changing state, and `@Pure` for functions
  that do nothing else.
- annotations that change how the compiler treats a declaration, such as `@HandledBy`, which names
  the handler `main` uses for an effect.

```fckt
max(3, 8)                       // 8
abs(-4)                         // 4
sqrt(2.0)                       // 1.4142135623730951
7.toFloat() / 2.0               // 3.5
identity("same")                // same
```

## fckt.values

`fckt.values.Mutable` holds a single value that can change. `Mutable(0)` makes one, and you read
and change it through `value`:

```fckt
import fckt.values.Mutable

counter = Mutable(0)
counter.value += 1
counter.value += 1
counter.value                   // 2
```

Changing it is `@Mutating`. [Mutation](/mutation) explains when that matters, and
[Collections and text](/collections#mutable) has more examples.

## The packages

| Page | What's in it |
| --- | --- |
| [Collections](/standard-library/collections) | Maps, sets, arrays you can change in place, and streams that can go on forever |
| [Option and Result](/standard-library/option-and-result) | Blocks that chain steps which might fail, and checking several things at once |
| [Effects](/standard-library/effects) | Failing with a reason and catching it, and generators |
| [Files and processes](/standard-library/io) | The console, paths, files, other programs, standard input and output |
| [Concurrency](/standard-library/concurrency) | Tasks that take turns, and waiting for time or input without blocking the others |
| [Time](/standard-library/time) | Instants, durations and the clock |
| [Text](/standard-library/text) | Bytes, UTF-8, digests, and formats that write a value as text and read it back |
