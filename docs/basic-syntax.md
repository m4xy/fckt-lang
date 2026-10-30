# Basic syntax

A collection of fckt's basic syntax, with examples. Each section ends with a link to where the
language reference says more, once it exists. If you know Kotlin, most of this will look familiar;
[Coming from Kotlin](/coming-from-kotlin) lists the differences in one place.

## Packages and imports

A folder is a package. A file uses its own package's declarations by name, and other packages'
through imports:

```fckt
import fckt.io.Console          // one declaration
import geometry.Shapes          // a module, with its types and their cases
import geometry.Shapes.area     // one function from a module
import fckt.collections.Maps.*  // everything in a module
import geometry.Shapes.Shape.Circle as Round
```

A file whose name is capitalised, such as `Shapes.fk`, declares one thing named as the file is:
`module Shapes { ... }`. A file with a lower-case name holds its package's own declarations.

## Program entry point

A program's entry point is `main`. It may take the command-line arguments:

```fckt
import fckt.io.Console

main() = println("Hello, fckt!")
```

```fckt
main(args: List<String>) = println("${args.size} arguments")
```

## Print to the standard output

`println` and `print` come from the `Console` effect, which `main` answers with the terminal.
They take a `String`, so print other values through a string template:

```fckt
import fckt.io.Console

main() = {
  println("Hello")
  println("${1 + 2}")
}
```

## Functions

A function is its parameters and an expression. There's no `fun` keyword:

```fckt
sum(a: Int, b: Int): Int = a + b
```

The result type can be left to inference:

```fckt
double(x: Int) = x * 2
```

Parameters can have defaults, and a call can name its arguments:

```fckt
greet(name: String, greeting: String = "Hello") = "$greeting, $name!"

greet("fckt")                   // Hello, fckt!
greet("fckt", greeting = "Hi")  // Hi, fckt!
```

A body that needs several steps is a block. A block is an expression, and its last line is its
value:

```fckt
countPositive(xs: List<Int>): Int = {
  var n = 0
  xs.forEach { if (it > 0) n += 1 }
  n
}
```

Top-level functions can be declared in any order, and can call each other recursively.

## Values and variables

A binding is a name and a value. There's no `val`: every binding is immutable.

```fckt
total = 42
greeting = "Hello"
```

`var` declares a local that can change:

```fckt
var n = 0
n += 1
```

Changing state is an effect, `@Mutating`. A function that only changes locals it made itself, as
`countPositive` above does, is still pure.

## Types

A type with fields is declared with parentheses. It's an immutable record:

```fckt
type Point(x: Int, y: Int)

p = Point(1, 2)
p.x                  // 1
p.copy(y = 5)        // Point(x=1, y=5)
```

A type with one unnamed field calls it `value`: `type Money(Int)` is `type Money(value: Int)`.

Another name for a type is an alias: `type Names = List<String>`.

## Types with cases

A type declared with braces has cases, and a value is exactly one of them. This is Kotlin's
sealed interface, in one declaration:

```fckt
type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
}
```

Cases that carry nothing make an enumeration: `type Level { Debug, Info }`. `Level.values` is every
case in order, and `level.name` a case's name.

## String templates

```fckt
name = "fckt"
"Hello, $name"                  // a name
"${name.length} characters"     // an expression
```

Values print like Kotlin's `toString()`: `Point(x=1, y=2)`, `[1, 2, 3]`, `Some(4)`.

## Conditional expressions

`if` is an expression:

```fckt
maxOf(a: Int, b: Int) = if (a > b) a else b
```

## when

`when` matches a value against patterns. It must cover every value: leave out a case, and the
compiler says which one is missing.

```fckt
area(shape: Shape): Float = when (shape) {
  is Circle -> 3.0 * shape.radius * shape.radius
  is Rectangle -> shape.width * shape.height
}
```

Inside a branch, `is` narrows the value, so `shape.radius` can be read. Without a subject, `when`
picks the first true condition:

```fckt
describe(n: Int) = when {
  n < 0 -> "negative"
  n == 0 -> "zero"
  else -> "positive"
}
```

Patterns can take values apart, and a guard adds a condition:

```fckt
firstEven(xs: List<Int>): Option<Int> = when (xs.filter { it % 2 == 0 }) {
  [] -> None
  [x, *_] -> Some(x)
}
```

## Lists

```fckt
xs = [1, 2, 3, 4]
xs.filter { it > 2 }            // [3, 4]
xs.map { it * 2 }               // [2, 4, 6, 8]
[0, *xs]                        // [0, 1, 2, 3, 4]
xs + [5]                        // [1, 2, 3, 4, 5]
```

A function's last argument can be a block after the call, as in Kotlin. A block with one parameter
calls it `it`.

## Ranges

```fckt
(1..5).map { it * it }          // [1, 4, 9, 16, 25]
0..<xs.size                     // the indexes of xs
5.downTo(1)                     // [5, 4, 3, 2, 1]
```

## Option instead of null

fckt has no `null`. A value that may be missing is an `Option`: `Some(x)` or `None`.

```fckt
"42".toIntOrNone()              // Some(42)
["a"].firstOrNone().getOrElse("none")
```

## Result

An operation that can fail gives a `Result`, `Ok(value)` or `Error(reason)`:

```fckt
parseAge(text: String): Result<Int, String> = when (text.toIntOrNone()) {
  Some(n) if n >= 0 -> Ok(n)
  else -> Error("not an age: $text")
}
```

## Pipes and tuples

`|>` passes a value to a function:

```fckt
xs |> doubleAll                 // doubleAll(xs)
```

Tuples group values without naming a type, and destructure the same way:

```fckt
(a, b) = (1, "one")
"$a is $b"                      // 1 is one
```

## Effects

A function says what it does besides work out its result, before its name. A function that says
nothing is pure, and the compiler checks it:

```fckt
import fckt.io.Console

effect Clock { now(): Int }

@Clock @Console stamped(message: String) = println("[${now()}] $message")
```

`Clock` is a handled effect: whatever handles it answers `now()`. Here the block is run with a
clock that always says 42:

```fckt
main() = Clock(now = ~42) { stamped("started") }
```

```
[42] started
```

`~42` is a function that ignores its arguments and gives 42. The same mechanism lets a test answer
`Console` itself, so code that prints is tested without a terminal. See [Idioms](/idioms#test-code-that-does-i-o).

## Comments

```fckt
// A comment to the end of the line.
/* A block comment. */
```
