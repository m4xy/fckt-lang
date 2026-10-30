# Handlers

Printing is an effect too. `println` belongs to `Console`, and a function that prints says
`@Console`:

```fckt
import fckt.io.Console

@Console welcome() = {
  println("Hello")
  println("Come in")
}
```

`main` prints to the terminal, but any code can run `welcome` with a handler of its own, which
decides what each `println` does. This is how you test code that prints: catch what it prints
instead of letting it reach the screen.

A handler for `Console` gives a function for each of its operations: `print`, `println` and
`readLine`. `~""` is a function that ignores what it's given and returns `""`.

## Your task

Write `printed`, which runs `welcome` and gives back the lines it printed, in order, without
printing anything. Keep the lines in a `var` inside `printed`. A `var` that never leaves its
function doesn't make the function impure, so `printed` needs no effects of its own.

```fckt lesson-starter
import fckt.io.Console

@Console welcome() = {
  println("Hello")
  println("Come in")
}

printed(): List<String> = []
```

```fckt lesson-solution
import fckt.io.Console

@Console welcome() = {
  println("Hello")
  println("Come in")
}

printed(): List<String> = {
  var lines: List<String> = []
  Console(print = s -> Unit, println = line -> { lines = lines + [line] }, readLine = ~"") {
    welcome()
  }
  lines
}
```

```fckt lesson-check
main() = {
  expect(printed() == ["Hello", "Come in"], "printed gave ${printed()}, but welcome prints [Hello, Come in]")
}
```

```text lesson-hint
Console(print = ..., println = ..., readLine = ...) { welcome() } runs welcome with your handler.
```

```text lesson-hint
In println's function, add the line to your var: line -> { lines = lines + [line] }.
```
