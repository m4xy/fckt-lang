# Option

Sometimes there's no answer: an empty list has no first item, and a list might have nothing that
matches what you're looking for. fckt says so in the type. An `Option` is either `Some(value)` or
`None`:

```fckt
[3, 8, 12].find { it > 5 }      // Some(8)
[3, 4].find { it > 5 }          // None
```

You can't use what's inside an `Option` until you've said what happens when it's missing.
`getOrElse` gives a fallback, and `map` changes the value if there is one:

```fckt
[3, 4].find { it > 5 }.getOrElse(0)       // 0
[3, 8].find { it > 5 }.map { it * 10 }    // Some(80)
```

`when` works too, with a branch for `Some` and one for `None`:

```fckt
describe(n: Option<Int>): String = when (n) {
  Some(x) -> "found $x"
  None -> "nothing"
}
```

## Your task

Write `firstLong`, which finds the first word longer than five letters, if there is one. Then write
`report`, which says `first long word: ` and the word, or `no long words` when there isn't one.

```fckt lesson-starter
firstLong(words: List<String>): Option<String> = None

report(words: List<String>): String = "?"
```

```fckt lesson-solution
firstLong(words: List<String>): Option<String> = words.find { it.length > 5 }

report(words: List<String>): String = when (firstLong(words)) {
  Some(word) -> "first long word: $word"
  None -> "no long words"
}
```

```fckt lesson-check
main() = {
  words = ["sea", "lantern", "ink", "harbour"]
  expect(firstLong(words) == Some("lantern"), "firstLong gave ${firstLong(words)}, but it should be Some(lantern)")
  expect(firstLong(["a", "b"]) == None, "firstLong([a, b]) gave ${firstLong(["a", "b"])}, but there are no long words")
  expect(report(words) == "first long word: lantern", "report gave '${report(words)}'")
  expect(report([]) == "no long words", "report([]) gave '${report([])}', but it should be 'no long words'")
}
```

```text lesson-hint
find gives the first item its block says yes to: words.find { it.length > 5 }.
```

```text lesson-hint
In report, use when (firstLong(words)) with a Some(word) branch and a None branch.
```
