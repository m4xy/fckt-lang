# Failing

A `Result` is the right choice when the caller will look at what went wrong. When they usually
won't, a function can fail instead, with `fail` and a reason. A function that can fail says
`@Fail`:

```fckt
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail half(n: Int): Int = if (n % 2 == 0) n / 2 else fail("$n is odd")
```

A failure stops what's running and goes up through the callers until something catches it.
`attempt` catches it and gives back a `Result`:

```fckt
attempt { half(10) }            // Ok(5)
attempt { half(7) }             // Error(7 is odd)
```

## Your task

Write `divide`, which fails with `can't divide by zero` when asked to divide by zero. Then write
`safeDivide`, which uses `divide` but gives back a `Result` instead of failing.

```fckt lesson-starter
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail divide(a: Int, b: Int): Int = if (b == 0) 0 else a / b

safeDivide(a: Int, b: Int): Result<Int, String> = Ok(0)
```

```fckt lesson-solution
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail divide(a: Int, b: Int): Int = if (b == 0) fail("can't divide by zero") else a / b

safeDivide(a: Int, b: Int): Result<Int, String> = attempt { divide(a, b) }
```

```fckt lesson-check
main() = {
  expect(safeDivide(6, 3) == Ok(2), "safeDivide(6, 3) gave ${safeDivide(6, 3)}, but it should be Ok(2)")
  expect(safeDivide(1, 0) == Error("can't divide by zero"), "safeDivide(1, 0) gave ${safeDivide(1, 0)}")
  expect(attempt { divide(5, 0) } == Error("can't divide by zero"), "divide(5, 0) didn't fail with 'can't divide by zero'")
}
```

```text lesson-hint
fail("can't divide by zero") stops divide with that reason.
```

```text lesson-hint
attempt { divide(a, b) } gives Ok with the answer, or Error with the reason it failed.
```
