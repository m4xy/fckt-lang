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

```fckt no-check
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

### Covering every case

A `when` needs a branch for every possible value. If you leave one out, the error tells you what's
missing. Here's one without a branch for `Square`:

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

If you add a case to a type later, each `when` that's missing it shows up as an error.

Numbers and strings have too many values to list, so a `when` on them needs an `else`:

```
error: this when doesn't cover every Int; add an else
```

## Patterns

A pattern can be more than a single value.

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

A guard adds a condition to a branch. The examples use [`Option`](/collections#option), which is
either `Some(value)` or `None`. Write `if` and the condition after the pattern. The branch
matches only when the pattern fits and the condition is true. The condition can use any names the
pattern introduced:

```fckt
classify(n: Option<Int>) = when (n) {
  Some(x) if x > 100 -> "big"
  Some(x) -> "some $x"
  None -> "nothing"
}

classify(Some(500))             // big
classify(Some(5))               // some 5
```

Because a guard might be false, a guarded branch doesn't count towards covering every case. Without
the plain `Some(x)` branch, you'd get this error:

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
opposite. When the answer decides what runs next, the code that runs can rely on it:

```fckt
radiusOf(shape: Shape) = if (shape is Circle) shape.radius else 0.0

bigCircle(shape: Shape) = shape is Circle && shape.radius > 10.0

notCircle(shape: Shape) = if (shape !is Circle) "not a circle" else "radius ${shape.radius}"
```

In `radiusOf`, `shape` is treated as a `Circle` inside the `if` branch, so `shape.radius` works.
After `&&`, the rest of the condition can use it the same way. With `!is`, it's the `else` branch
that can.

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
