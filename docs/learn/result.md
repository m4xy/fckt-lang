# Result

When something can go wrong, a `Result` says what happened. It's either `Ok(value)` or
`Error(reason)`, and both are values you can pass around like any other:

```fckt
half(n: Int): Result<Int, String> = if (n % 2 == 0) Ok(n / 2) else Error("$n is odd")

half(10)                        // Ok(5)
half(7)                         // Error(7 is odd)
```

`map` changes an `Ok`'s value and leaves an `Error` as it is. For a whole list, `mapResult` gives
`Ok` with every value if each one works, or the first `Error`:

```fckt
half(10).map { it + 1 }         // Ok(6)
[2, 4].mapResult { half(it) }   // Ok([1, 2])
[2, 3].mapResult { half(it) }   // Error(3 is odd)
```

## Your task

Write `parseAge`, which reads an age from text. It's an `Error` saying `not a number: ` and the text
when the text isn't a number, `not an age: ` and the number when it's below 0 or above 150, and
`Ok` otherwise. Then write `parseAges`, which reads a whole list.

```fckt lesson-starter
parseAge(text: String): Result<Int, String> = Ok(0)

parseAges(texts: List<String>): Result<List<Int>, String> = Ok([])
```

```fckt lesson-solution
parseAge(text: String): Result<Int, String> = when (text.toIntOrNone()) {
  None -> Error("not a number: $text")
  Some(n) -> if (n < 0 || n > 150) Error("not an age: $n") else Ok(n)
}

parseAges(texts: List<String>): Result<List<Int>, String> = texts.mapResult { parseAge(it) }
```

```fckt lesson-check
main() = {
  expect(parseAge("36") == Ok(36), "parseAge(36) gave ${parseAge("36")}, but it should be Ok(36)")
  expect(parseAge("old") == Error("not a number: old"), "parseAge(old) gave ${parseAge("old")}")
  expect(parseAge("200") == Error("not an age: 200"), "parseAge(200) gave ${parseAge("200")}")
  expect(parseAge("-1") == Error("not an age: -1"), "parseAge(-1) gave ${parseAge("-1")}")
  expect(parseAges(["1", "2"]) == Ok([1, 2]), "parseAges([1, 2]) gave ${parseAges(["1", "2"])}")
  expect(parseAges(["1", "x", "y"]) == Error("not a number: x"), "parseAges([1, x, y]) gave ${parseAges(["1", "x", "y"])}, but it should stop at x")
}
```

```text lesson-hint
text.toIntOrNone() gives Some(number) or None. Use when on it.
```

```text lesson-hint
mapResult runs your function on each item and stops at the first Error: texts.mapResult { parseAge(it) }.
```
