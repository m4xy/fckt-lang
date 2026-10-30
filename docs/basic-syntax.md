# Basic syntax

This page walks through the parts of fckt you'll use every day, with a short example for each.

## Packages and imports

Every folder in your project is a package. Files in the same package can use each other's
declarations directly. To use something from another package, import it:

```fckt
import fckt.io.Console          // one declaration
import geometry.Shapes          // a module, with its types and their cases
import geometry.Shapes.area     // one function from a module
import fckt.collections.Maps.*  // everything in a module
import geometry.Shapes.Shape.Circle as Round
```

If a file's name starts with a capital letter, like `Shapes.fk`, it holds one declaration with the
same name, such as `module Shapes { /* ... */ }`. Files with lower-case names can hold anything.

## Program entry point

Every program starts at `main`:

```fckt
import fckt.io.Console

main() = println("Hello, fckt!")
```

If you need the command-line arguments, give `main` a parameter:

```fckt
main(args: List<String>) = println("${args.size} arguments")
```

## Print to the standard output

`println` prints a line, and `print` prints without starting a new one. Both come from `Console`,
so you need to import it. `println` takes a `String`, so to print a number or any other value, put
it in a string template:

```fckt
import fckt.io.Console

main() = {
  println("Hello")
  println("${1 + 2}")
}
```

Printing is an [effect](#effects). Most functions have to say which effects they use, but `main`
doesn't need to: it's allowed to do anything.

## Functions

You write a function as its name, its parameters, and then `=` followed by what it returns:

```fckt
sum(a: Int, b: Int): Int = a + b
```

You can leave out the return type, and fckt will work it out:

```fckt
double(x: Int) = x * 2
```

Parameters can have default values. When you call a function, you can name the arguments you pass:

```fckt
greet(name: String, greeting: String = "Hello") = "$greeting, $name!"

greet("fckt")                   // Hello, fckt!
greet("fckt", greeting = "Hi")  // Hi, fckt!
```

If a function needs more than one line, use a block. The value of a block is the value of its last
line:

```fckt
countPositive(xs: List<Int>): Int = {
  var n = 0
  xs.forEach { if (it > 0) n += 1 }
  n
}
```

You can declare functions in any order, and they can call each other.

## Values and variables

To name a value, write the name, `=`, and the value. Once a name has a value, it can't be changed:

```fckt
total = 42
greeting = "Hello"
```

When you do need something that changes, such as a counter, declare it with `var`:

```fckt
var n = 0
n += 1
```

## Types

To define your own type, list its fields in parentheses:

```fckt
type Point(x: Int, y: Int)

p = Point(1, 2)
p.x                  // 1
p.copy(y = 5)        // Point(x=1, y=5)
```

Fields can't be changed after a value is created. To get a value with a different field, use `copy`,
which leaves the original as it was.

If a type has a single field and you don't name it, it's called `value`: `type Money(Int)` is the
same as `type Money(value: Int)`.

You can also give an existing type another name: `type Names = List<String>`.

## Types with cases

Some types have a fixed set of alternatives. A shape might be a circle or a rectangle, and never
anything else. Declare the alternatives, called cases, in braces:

```fckt
type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
}
```

If none of the cases hold any data, you get an enumeration: `type Level { Debug, Info }`. Use
`Level.values` to get all the cases in order, and `level.name` to get a case's name as text.

## String templates

Put `$` before a name, or wrap an expression in `${...}`, to insert it into a string:

```fckt
name = "fckt"
"Hello, $name"                  // a name
"${name.length} characters"     // an expression
```

Values of your own types are printed with their type name and fields, such as `Point(x=1, y=2)`.
Lists print as `[1, 2, 3]`, and options as `Some(4)` or `None`.

## Conditional expressions

`if` gives back a value, so you can use it anywhere an expression is expected:

```fckt
maxOf(a: Int, b: Int) = if (a > b) a else b
```

## when

Use `when` to check a value against several possibilities, with a branch for each case. If you
leave one out, the error says which:

```fckt
area(shape: Shape): Float = when (shape) {
  is Circle -> 3.0 * shape.radius * shape.radius
  is Rectangle -> shape.width * shape.height
}
```

Inside the `is Circle` branch, fckt knows `shape` is a `Circle`, so you can read `shape.radius`.

Without a value to check, `when` runs the first branch whose condition is true:

```fckt
describe(n: Int) = when {
  n < 0 -> "negative"
  n == 0 -> "zero"
  else -> "positive"
}
```

Branches can also match the shape of a value. Here, `[]` matches an empty list, and `[x, *_]`
matches a list that starts with `x`:

```fckt
firstEven(xs: List<Int>): Option<Int> = when (xs.filter { it % 2 == 0 }) {
  [] -> None
  [x, *_] -> Some(x)
}
```

## Lists

Write a list in square brackets:

```fckt
xs = [1, 2, 3, 4]
xs.filter { it > 2 }            // [3, 4]
xs.map { it * 2 }               // [2, 4, 6, 8]
[0, *xs]                        // [0, 1, 2, 3, 4]
xs + [5]                        // [1, 2, 3, 4, 5]
```

When the last thing a function takes is another function, you can pass it as a block after the
call, as `filter` and `map` do here. Inside a block that takes one value, that value is called `it`.

## Ranges

```fckt
(1..5).map { it * it }          // [1, 4, 9, 16, 25]
0..<xs.size                     // the indexes of xs
5.downTo(1)                     // [5, 4, 3, 2, 1]
```

`1..5` includes both ends. `0..<n` stops just before `n`.

## Missing values

fckt has no `null`. When a value might not be there, its type is `Option`, and it's either
`Some(value)` or `None`:

```fckt
"42".toIntOrNone()              // Some(42)
["a"].firstOrNone().getOrElse("none")
```

## Result

When something can go wrong, return a `Result`. It holds either `Ok(value)` or
`Error(reason)`:

```fckt
parseAge(text: String): Result<Int, String> = when (text.toIntOrNone()) {
  Some(n) if n >= 0 -> Ok(n)
  else -> Error("not an age: $text")
}
```

The `if n >= 0` on the first branch is a guard: the branch only matches when it's true.

## Pipes and tuples

`|>` passes the value on its left to the function on its right:

```fckt
xs |> doubleAll                 // doubleAll(xs)
```

A tuple groups a few values together without defining a type. You can unpack one into names:

```fckt
(a, b) = (1, "one")
"$a is $b"                      // 1 is one
```

## Effects

An effect is anything a function does apart from returning a value: printing, reading a file,
asking for the time. In fckt, a function lists the effects it uses before its name. A function that
lists none is pure: it can only compute its result.

You can define effects of your own. Here, `Clock` has one operation, `now`, and `stamped` uses
both `Clock` and `Console`:

```fckt
import fckt.io.Console

effect Clock { now(): Int }

@Clock @Console stamped(message: String) = println("[${now()}] $message")
```

`stamped` doesn't decide what `now()` returns. Whatever code runs it does, by handling the effect.
Here, `main` runs it with a clock that always says 42:

```fckt
main() = Clock(now = ~42) { stamped("started") }
```

```
[42] started
```

`~42` is shorthand for a function that ignores its arguments and returns 42.

A test can handle `Console` the same way and collect what would have been printed. There's an example in [Idioms](/idioms#test-code-that-does-i-o).

As mentioned earlier, `main` doesn't have to list its effects. It can do anything, and the program
handles them for it. `Console`, for example, is connected to the terminal.

Changing a `var` is an effect too, called `@Mutating`. But if a function only changes variables it
created itself, as `countPositive` does above, nobody outside can see the change, so the function
still counts as pure and doesn't need to declare it.

## Comments

```fckt
// A comment to the end of the line.
/* A block comment. */
```
