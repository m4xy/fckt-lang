# Functions

This page covers declaring functions, calling them, passing them around, and adding them to existing
types.

## Declaring a function

Write the function's name, its parameters in parentheses, then `=` and the expression it returns:

```fckt
sum(a: Int, b: Int): Int = a + b
```

The `: Int` after the parameters is the return type. If you leave it out, it's worked out
from the body:

```fckt
double(x: Int) = x * 2
```

Parameters always need their types. It's still worth writing the return type on functions that other
code relies on, because it shows at a glance what they give back.

## Blocks

When a function needs more than one step, write its body as a block in braces. Each line can name
an intermediate value, and the last line is what the block gives back:

```fckt
average(xs: List<Int>): Float = {
  total = xs.sum()
  total * 1.0 / xs.size
}

average([1, 2, 3, 4])           // 2.5
```

Dividing two `Int`s gives an `Int`. Multiplying by `1.0` first makes the division work with
decimals.

## Default and named arguments

A parameter can have a default value. Callers can leave it out:

```fckt
greet(name: String, greeting: String = "Hello", punctuation: String = "!") =
  "$greeting, $name$punctuation"

greet("Ada")                    // Hello, Ada!
```

When you call a function, you can name the arguments you pass. This lets you skip one default and
set the next:

```fckt
greet("Ada", punctuation = ".")       // Hello, Ada.
greet("Ada", "Hi", punctuation = "?") // Hi, Ada?
```

Pass the arguments in order first, then the named ones.

## Order and recursion

Top-level functions can be declared in any order. A function can call itself, and two functions can
call each other:

```fckt
isEven(n: Int): Boolean = if (n == 0) true else isOdd(n - 1)
isOdd(n: Int): Boolean = if (n == 0) false else isEven(n - 1)

isEven(10)                      // true
```

## Generic functions

A function can work with any type. Put type parameters in angle brackets after its name:

```fckt
first<A>(xs: List<A>, fallback: A): A = when (xs) {
  [] -> fallback
  [x, *_] -> x
}

first(["a", "b"], "none")       // a
```

The `when` here checks whether the list is empty. [Control flow](/control-flow#lists) explains list
patterns like `[x, *_]`.

`A` is worked out from the arguments you pass. An empty map has no arguments, so you write its
types in angle brackets after the name:

```fckt
import fckt.collections.Maps.*

empty = emptyMap<String, Int>()
```

## Functions as values

You can pass a function to another function. A function's type is written as its parameter types in
parentheses, then `->`, then what it gives back, so `(Int) -> Int` is a function that takes an `Int`
and gives back an `Int`. `twice` takes one of those and calls it two times, here with `double` from
the top of this page:

```fckt
twice(f: (Int) -> Int, x: Int): Int = f(f(x))

twice(double, 3)                // 12
```

### Lambdas

A lambda is a function without a name. Write its parameters, `->`, then its result:

```fckt
twice(x -> x * x, 3)            // 81

add = (a: Int, b: Int) -> a + b
add(2, 3)                       // 5
```

If you don't need a parameter, call it `_`.

### Functions that return functions

A function can also give back a function. Here's the derivative from first principles: the slope
of `f` at `x` is roughly `(f(x + h) - f(x)) / h` when `h` is very small. `derivative` takes `f` and
returns a new function that works out that slope at any `x`:

```fckt
derivative(
  f: (Float) -> Float,
  h: Float = 0.000001,
): (Float) -> Float =
  x -> (f(x + h) - f(x)) / h

square(x: Float) = x * x
cube(x: Float) = x * x * x

slope = derivative(square)
slope(3.0)                            // 6.000001000927568
derivative(cube)(2.0)                 // 12.000006002210739
derivative(derivative(cube))(2.0)     // 11.999290450148692
derivative(sin)(0.0)                  // 0.9999999999998334
```

The exact answers are 6, 12, 12 and 1. The results are close because `h` is small, and the second
derivative is a little further off because it approximates an approximation. Since the result of
`derivative` is an ordinary function, you can pass it straight back in.

### Passing a block

When a function's last parameter is a function, you can pass it as a block after the call instead.
This is how you'll usually call `map`, `filter` and `fold`:

```fckt
[1, 2, 3].map { it * 10 }                     // [10, 20, 30]
[1, 2, 3].fold(0) { acc, x -> acc + x }       // 6
```

A block that takes one value can call it `it`, as `map` does here. When the block takes more than
one, name them before `->`, as `fold` does.

If a list holds pairs, a lambda with two parameters takes each pair apart:

```fckt
[(1, "one"), (2, "two")].map((n, word) -> word)   // [one, two]
[(1, "one"), (2, "two")].map((_, word) -> word)   // [one, two]
```

Your own functions work the same way. If the last parameter is a function, callers can pass a block:

```fckt
both(block: () -> Int): Int = block() + block()

both { 21 }                     // 42
```

### Functions that ignore their arguments

`~` before an expression makes a function that ignores whatever it's given and returns that
expression. It's a short way to pass a constant where a function is expected:

```fckt
always = ~true
always()                        // true

[1, 2, 3].filter(~true)         // [1, 2, 3]
```

## Extension functions and properties

You can add a function to a type you didn't write, then call it with a dot as if it were part of
the type. Write the type, a dot, and the function's name. Inside, `this` is the value it was called
on:

```fckt
List<A>.second(): Option<A> = when (this) {
  [_, x, *_] -> Some(x)
  else -> None
}

[1, 2, 3].second()              // Some(2)
```

Leave out the parentheses to make a property instead:

```fckt
String.shout: String = this.uppercase()

"fckt".shout                    // FCKT
```

## Operators

To use an operator like `+` with your own type, write an extension function with the operator's
name and mark it `operator`:

```fckt
type Money(Int)
operator Money.plus(other: Money): Money = Money(this.value + other.value)
operator Money.times(n: Int): Money = Money(this.value * n)

Money(2) + Money(3)             // Money(value=5)
Money(2) * 3                    // Money(value=6)
```

| Operator | Function |
| --- | --- |
| `a + b` | `plus` |
| `a - b` | `minus` |
| `a * b` | `times` |
| `a / b` | `div` |
| `a % b` | `rem` |
| `-a` | `unaryMinus` |
| `a..b` | `rangeTo` |
| `a..<b` | `rangeUntil` |

## Pipes

`|>` passes the value on its left to the function on its right:

```fckt
3 |> double                     // 6
```

If you give the function on the right some of its arguments, the value on the left becomes the last
one:

```fckt
subtractFrom(a: Int, b: Int) = a - b

10 |> subtractFrom(3)           // -7, the same as subtractFrom(3, 10)
```

## main

A program starts at `main`. It can take the command-line arguments as a list:

```fckt
main(args: List<String>) = println("${args.size} arguments")
```

Unlike other functions, `main` doesn't have to declare its [effects](/basic-syntax#effects).
