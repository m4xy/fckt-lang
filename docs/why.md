# Why fckt

fckt is a functional language for people who learned to program in languages like Java, C#,
JavaScript, Swift or Go. It's built around three ideas.

## Pure code by default

A pure function works out its result from its arguments and does nothing else. Call it twice with
the same arguments and you get the same answer. It doesn't print, write files, read the clock or
change anything another part of the program can see.

Pure functions are easier to test, because there's nothing to set up or clean up. They're easier to
reuse, because they don't depend on where they're called from. And they're easier to read, because
the declaration tells you everything the function can do.

In most languages, you can't tell from a function's declaration whether it's pure. Any function can
print or write to a database, and you only find out by reading it. In fckt, a function that does
any of those things says so in its declaration:

```fckt
import fckt.io.Console

total(prices: List<Int>) = prices.sum()

@Console report(prices: List<Int>) = println("Total: ${total(prices)}")
```

`total` declares no effects, so it can only add up the list. `report` prints, so it's marked
`@Console`. If `total` tried to print, you'd get this error:

```
error: 'total' does @Console, so it must say so: @Console total(...)
```

Effects aren't forbidden. Real programs need to print, read files and talk to the network. fckt
just makes them visible, and lets you decide how they're carried out. The same `report` can print
to the terminal when the program runs, and write into a list when a test runs it.

## A syntax you can already read

Functional languages have a reputation for being hard to read, and a lot of that comes from
unfamiliar syntax. fckt uses the curly braces, parentheses and dot calls you already know:

```fckt
type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
}

area(shape: Shape): Float = when (shape) {
  is Circle -> 3.0 * shape.radius * shape.radius
  is Rectangle -> shape.width * shape.height
}
```

There's very little ceremony. A type with fields is one line, and you get equality, copying and
printing without writing them. A function that returns one expression is one line too. Types are
worked out for you inside functions, so you write them where they help the reader, not everywhere.

## A way into functional programming

Immutable values, functions passed as arguments, types that list every case, effects you can see:
these ideas make code easier to change and harder to break, in any language. They're usually
learned through languages that look very different from what most programmers use day to day.

fckt teaches the same ideas without the culture shock. Values don't change unless you mark them
`var`. A `when` has a branch for every case of a type. Missing values are an `Option`, not `null`.
Each of these is a small step from code you've written before, and together they add up to a
functional style.

When you want to go further, the rest is there: modules and functors for structuring large
programs, effect handlers for generators and concurrency, and blocks that chain steps which might
fail.

## What fckt isn't

fckt is a young language. Its standard library covers text, collections, files, processes and
time, but it's still small. Programs compile to native executables and
don't run on the JVM, so Java libraries aren't available.
