# Lists and lambdas

A list holds values of one type, in order:

```fckt
words = ["sea", "glass", "ink", "paper"]
words.size                      // 4
```

Lists have functions that take another function and use it on each item. `map` makes a new list
from what the function gives back, and `filter` keeps the items it says yes to. The function you
pass is often a block in braces after the call, where `it` is the current item:

```fckt
words.map { it.uppercase() }    // [SEA, GLASS, INK, PAPER]
words.filter { it.length > 3 }  // [glass, paper]
```

`fold` combines the items one at a time. It starts from a value you give it, and its block takes
what it has so far and the next item:

```fckt
[1, 2, 3].fold(0) { total, n -> total + n }   // 6
```

## Your task

Write three functions over a list of words:

- `long` keeps the words with more than three letters.
- `shouted` gives every word in capitals.
- `letters` adds up how many letters there are in all of them.

```fckt lesson-starter
long(words: List<String>): List<String> = words

shouted(words: List<String>): List<String> = words

letters(words: List<String>): Int = 0
```

```fckt lesson-solution
long(words: List<String>): List<String> = words.filter { it.length > 3 }

shouted(words: List<String>): List<String> = words.map { it.uppercase() }

letters(words: List<String>): Int = words.fold(0) { total, word -> total + word.length }
```

```fckt lesson-check
main() = {
  words = ["sea", "glass", "ink", "paper"]
  expect(long(words) == ["glass", "paper"], "long gave ${long(words)}, but it should be [glass, paper]")
  expect(shouted(words) == ["SEA", "GLASS", "INK", "PAPER"], "shouted gave ${shouted(words)}, but it should be [SEA, GLASS, INK, PAPER]")
  expect(letters(words) == 16, "letters gave ${letters(words)}, but there are 16 letters")
  expect(letters([]) == 0, "letters([]) gave ${letters([])}, but an empty list has no letters")
}
```

```text lesson-hint
filter keeps an item when its block gives true: words.filter { it.length > 3 }.
```

```text lesson-hint
fold's block takes the total so far and the next word: words.fold(0) { total, word -> total + word.length }.
```
