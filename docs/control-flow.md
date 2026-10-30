# Control flow

fckt has two ways to make decisions: `if` for a yes-or-no question, and `when` for everything else.
Both are expressions, so they give back a value you can name, return or pass along.

## if

`if` checks a condition and gives back one of two values:

```fckt
sign(n: Int) = if (n < 0) "negative" else if (n == 0) "zero" else "positive"

sign(-3)                        // negative
```

You can leave out `else` when the `if` doesn't give back a value, such as when it only prints:

```fckt
if (verbose) println("starting")
```

## when

`when` compares a value against a list of branches and runs the first one that matches. Each
branch is a pattern, `->`, and the result:

```fckt
describe(n: Int) = when (n) {
  0 -> "zero"
  1, 2, 3 -> "small"
  else -> "large"
}

describe(2)                     // small
```

Separate patterns with commas to share one branch, as `1, 2, 3` does. `else` matches anything the
branches above it didn't.

### Every case has to be handled

A `when` has to cover every possible value. If it doesn't, it won't compile, and the error tells
you what's missing. Leave out a case of `Shape`:

```fckt
type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
  Square(side: Float)
}

area(shape: Shape): Float = when (shape) {
  is Circle -> 3.0 * shape.radius * shape.radius
  is Rectangle -> shape.width * shape.height
}
```

```
error: this when doesn't cover Square(_); add it, or an else
```

When you add a case to a type later, every `when` that doesn't handle it shows up as an error, so
you can find them all.

Numbers and strings have too many values to list, so a `when` on them needs an `else`:

```
error: this when doesn't cover every Int; add an else
```

## Patterns

A branch's pattern can be much more than a single value.

### Literals

Numbers, strings, characters and `true` or `false` match themselves:

```fckt
greeting(name: String) = when (name) {
  "Ada" -> "Hello, Countess"
  else -> "Hello, $name"
}
```

### Cases with is

`is` matches a case of a type. Inside the branch, the value is known to be that case, so you can
read its fields:

```fckt
area(shape: Shape): Float = when (shape) {
  is Circle -> 3.0 * shape.radius * shape.radius
  is Rectangle -> shape.width * shape.height
  is Square -> shape.side * shape.side
}

area(Square(2.0))               // 4.0
```

### Taking a case apart

You can also match a case and name its fields in one go. `_` matches anything without naming it:

```fckt
size(shape: Shape) = when (shape) {
  Circle(r) -> "circle of radius $r"
  Rectangle(w, h) -> "$w by $h"
  Square(_) -> "a square"
}

size(Rectangle(2.0, 3.0))       // 2.0 by 3.0
```

The names go in the order the fields were declared.

### Lists

`[]` matches an empty list. `[x]` matches a list with exactly one item. `*rest` matches whatever's
left:

```fckt
firstTwo(xs: List<Int>) = when (xs) {
  [] -> "empty"
  [x] -> "just $x"
  [x, y, *rest] -> "$x, $y and ${rest.size} more"
}

firstTwo([1, 2, 3, 4])          // 1, 2 and 2 more
firstTwo([7])                   // just 7
```

## Guards

A guard adds a condition to a branch. Write `if` and the condition after the pattern. The branch
only matches when the pattern fits and the condition is true, and the condition can use the names
the pattern gave:

```fckt
classify(n: Option<Int>) = when (n) {
  Some(x) if x > 100 -> "big"
  Some(x) -> "some $x"
  None -> "nothing"
}

classify(Some(500))             // big
classify(Some(5))               // some 5
```

A guarded branch doesn't count towards covering every case, because its condition might be false.
Without the plain `Some(x)` branch, this wouldn't compile:

```
error: this when doesn't cover Some(_); add it, or an else
```

To check a condition that has nothing to do with the value, write `else if`:

```fckt
ready(n: Int, open: Boolean) = when (n) {
  0 -> "empty"
  else if open -> "open with $n"
  else -> "closed"
}
```

## when without a value

If you leave out the value, each branch is a condition, and `when` picks the first one that's true.
It reads better than a long chain of `if` and `else`:

```fckt
temperature(t: Int) = when {
  t < 0 -> "freezing"
  t < 20 -> "cool"
  else -> "warm"
}

temperature(12)                 // cool
```

## Matching several values at once

To match on two values together, put them both in the parentheses. Each pattern is then a tuple:

```fckt
both(a: Boolean, b: Boolean) = when (a, b) {
  (true, true) -> "both"
  (true, false), (false, true) -> "one"
  (false, false) -> "neither"
}

both(true, false)               // one
```

## Checking a case with is

Outside a `when`, `x is Circle` asks whether `x` is a `Circle`, and `x !is Circle` asks the
opposite. Where the answer decides what runs next, fckt narrows the type for you:

```fckt
radiusOf(shape: Shape) = if (shape is Circle) shape.radius else 0.0

bigCircle(shape: Shape) = shape is Circle && shape.radius > 10.0

notCircle(shape: Shape) = if (shape !is Circle) "not a circle" else "radius ${shape.radius}"
```

In `radiusOf`, the `if` branch knows `shape` is a `Circle`. After `&&`, so does the rest of the
condition. With `!is`, it's the `else` branch that knows.

## Taking values apart

To name the parts of a tuple, put the names in parentheses on the left of `=`:

```fckt
(name, age) = ("Ada", 36)
"$name is $age"                 // Ada is 36
```

This works on records too. The names go in the order the fields were declared:

```fckt
type Point(x: Int, y: Int)

(x, y) = Point(3, 4)            // x is 3, y is 4
```
