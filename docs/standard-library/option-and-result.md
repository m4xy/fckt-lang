# Option and Result

`Option` and `Result` are built into the language. An `Option` is `Some(value)` or `None`, and a
`Result` is `Ok(value)` or `Error(reason)`. [Collections and text](/collections#option) shows the
functions they come with, such as `map`, `getOrElse` and `mapResult`.

The `fckt.monads` package is for the step after that: writing a series of steps, each of which
might fail, without checking each one by hand.

| Import | What a block does |
| --- | --- |
| `fckt.monads.Options` | Stops at the first `None` |
| `fckt.monads.Results` | Stops at the first `Error` |
| `fckt.monads.Validated` | Runs every step and collects all the errors |
| `fckt.monads.Lists` | Tries every combination |

## Blocks of steps

Say you want to read two numbers and add them. Each `parse` gives a `Result`, so without any help
you'd check the first, then the second, then add:

```fckt
parse(s: String): Result<Int, String> = when (s.toIntOrNone()) {
  Some(n) -> Ok(n)
  None -> Error("not a number: $s")
}

addBoth(a: String, b: String): Result<Int, String> = when (parse(a)) {
  Error(e) -> Error(e)
  Ok(x) -> when (parse(b)) {
    Error(e) -> Error(e)
    Ok(y) -> Ok(x + y)
  }
}
```

With `Results`, you write the steps one after another. `by` takes the value out of each step. If a
step gives an `Error`, the block stops there and gives that error:

```fckt
import fckt.monads.Results

parse(s: String): Result<Int, String> = when (s.toIntOrNone()) {
  Some(n) -> Ok(n)
  None -> Error("not a number: $s")
}

addBoth(a: String, b: String): Result<Int, String> = Results {
  x by parse(a)
  y by parse(b)
  x + y
}

addBoth("3", "4")               // Ok(7)
addBoth("3", "four")            // Error(not a number: four)
```

The last line is the block's value, wrapped in `Ok`. Lines without `by` are ordinary steps, so you
can name things in between:

```fckt
import fckt.monads.Results

parse(s: String): Result<Int, String> = when (s.toIntOrNone()) {
  Some(n) -> Ok(n)
  None -> Error("not a number: $s")
}

positive(n: Int): Result<Int, String> = if (n > 0) Ok(n) else Error("$n isn't positive")

area(w: String, h: String): Result<Int, String> = Results {
  width by parse(w)
  height by parse(h)
  size = width * height
  checked by positive(size)
  checked
}

area("3", "5")                  // Ok(15)
area("3", "-5")                 // Error(-15 isn't positive)
```

`Options` works the same way for steps that give an `Option`, and stops at the first `None`:

```fckt
import fckt.monads.Options

half(n: Int): Option<Int> = if (n % 2 == 0) Some(n / 2) else None

quarter(n: Int): Option<Int> = Options {
  h by half(n)
  q by half(h)
  q
}

quarter(12)                     // Some(3)
quarter(6)                      // None
```

[Specs and
functors](/specs-and-functors#blocks-that-chain-steps) explains how these blocks work, and how to
write your own.

## Collecting every error

`Results` stops at the first error, which is often what you want. When you're checking a form,
though, it's more useful to report everything that's wrong at once. `Validated` does that. Each
check gives a `Validation`, which is either `Valid(value)` or `Invalid(errors)`:

```fckt
import fckt.monads.Validated
import fckt.monads.Validation

type User(name: String, age: Int)

checkName(name: String): Validation<String, String> =
  if (name == "") Invalid(["name is empty"]) else Valid(name)

checkAge(age: Int): Validation<Int, String> =
  if (age < 0) Invalid(["age $age is negative"]) else Valid(age)

user(name: String, age: Int): Validation<User, String> = Validated {
  n by checkName(name)
  a by checkAge(age)
  User(n, a)
}

user("Ada", 36)                 // Valid(value=User(name=Ada, age=36))
user("", -1)                    // Invalid(errors=[name is empty, age -1 is negative])
```

All the checks run, even after one fails. That means a check can't use what an earlier one
found, because the earlier one might not have found anything. If you try, you get this error:

```
error: Validated has no bind, so a step can't use a from an earlier step
```

To move between the two, `Validated.fromResult` turns a `Result` into a `Validation` with one
error, and `Validated.toResult` turns a `Validation` back into a `Result` with a list of errors:

```fckt
import fckt.monads.Validated
import fckt.monads.Validation

checked: Validation<Int, String> = Validated.fromResult(Error("too big"))
checked                         // Invalid(errors=[too big])
Validated.toResult(checked)     // Error([too big])
```

## Every combination

A `Lists` block treats each `by` as "for each item in this list". The block runs once for every
combination, and gives a list of all the results. `Lists.guard` drops the combinations where its
condition is false:

```fckt
import fckt.monads.Lists

pairs = Lists {
  x by [1, 2, 3]
  _ by Lists.guard(x > 1)
  y by ["a", "b"]
  (x, y)
}

pairs                           // [(2, a), (2, b), (3, a), (3, b)]
```

It's a short way to write searches. These are the right-angled triangles with sides up to 15:

```fckt
import fckt.monads.Lists

triangles = Lists {
  a by 1..15
  b by a..15
  c by b..15
  _ by Lists.guard(a * a + b * b == c * c)
  (a, b, c)
}

triangles                       // [(3, 4, 5), (5, 12, 13), (6, 8, 10), (9, 12, 15)]
```
