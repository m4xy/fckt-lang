# Regular expressions

[fk-regex](https://github.com/m4xy/fk-regex) finds text that matches a pattern. You use it to pull
an email address out of a sentence, check that some input looks like a date, or split a line on
commas.

The time fk-regex takes grows in step with the length of the text, whatever the pattern is. Many
regex libraries backtrack instead, and with a pattern like `(a*)*b`, the time they take doubles with
each extra `a` in the text. fk-regex follows every way the pattern could match at once, one
character at a time, so it never has to go back.

## Add it to your project

List the library in your project's dependencies in `build.fk`:

```fckt
import uk.m4xy.kiln.fckt.Fckt

project = Project(
  name = "shop",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-regex:0.1.0")],
)

plugins = [Fckt()]
```

Then import the types and the functions that work with them:

```fckt
import uk.m4xy.regex.*
import uk.m4xy.regex.Regexes.*
```

## Make a regex

`toRegex()` turns a string into a regex:

```fckt
email = "(\\w+)@(\\w+)\\.com".toRegex()
```

Backslashes in a fckt string are written twice, so `"\\w"` is the pattern `\w`.

If the pattern is wrong, for example a `(` that's never closed, `toRegex()` fails with the reason,
so it's marked `@Fail`. That suits patterns written into your code. For a pattern that comes from
the user, use `regex(pattern)` instead. It gives back a `Result`, which you can check:

```fckt
regex("(ab")       // Error(RegexError(at=0, message=this ( is never closed))
regex("a\\qb")     // Error(RegexError(at=1, message=\q means nothing here; write q alone for the letter))
```

`at` is where in the pattern the problem is.

## Find matches

`find` gives back the first match, if there is one:

```fckt
email.find("write to ada@example.com today")
// Some(Match(value=ada@example.com, start=9, end=24, groups=[Some(ada), Some(example)]))
```

A `Match` has the text that matched, where it starts, and where it ends. `group(n)` gives what the
`n`th pair of parentheses matched. Group `0` is the whole match:

```fckt
when (email.find("write to ada@example.com today")) {
  Some(m) -> println("${m.value} at ${m.start}, user ${m.group(1)}")   // ada@example.com at 9, user Some(ada)
  None -> println("no match")
}
```

A group that didn't take part in the match is `None`. Positions count characters, not bytes, so
`😀` counts as one.

`findAll` gives every match, from left to right:

```fckt
"\\d+".toRegex().findAll("a1b22c333").map { it.value }   // [1, 22, 333]
```

To ask a yes-or-no question, use `matches` when the whole text must match, and `containsMatchIn`
when a match anywhere will do:

```fckt
email.matches("ada@example.com")             // true
email.matches("ada@example.com!")            // false
email.containsMatchIn("no address here")     // false
```

## Replace and split

`replace` swaps each match for some new text. In the new text, `$1` is what group 1 matched, `$0`
is the whole match, and `$$` is a dollar sign. For groups past 9, write `${12}`:

```fckt
date = "(\\d{4})-(\\d{2})-(\\d{2})".toRegex()

date.replace("on 2026-10-30", "$3/$2/$1")    // on 30/10/2026
```

When the new text depends on the match, pass a function to `replaceWith`:

```fckt
"\\d+".toRegex().replaceWith("3 apples and 12 pears") { m -> "${m.value.length}" }
// 1 apples and 2 pears
```

`split` cuts the text wherever the pattern matches:

```fckt
",\\s*".toRegex().split("a, b,c")            // [a, b, c]
```

## Match text exactly

To search for text that might contain characters like `.` or `$`, pass it through `escape` first.
You get a pattern that matches the text as it's written:

```fckt
price = escape("$4.99")                         // \$4\.99
price.toRegex().containsMatchIn("only $4.99")   // true
```

## Patterns

| Pattern | Matches |
| --- | --- |
| `abc` | The characters themselves |
| `.` | Any character except a line break |
| `[a-z_]`, `[^0-9]` | One character in the set, or not in it |
| `\d`, `\w`, `\s` | A digit, a word character (`[A-Za-z0-9_]`), or a space |
| `\D`, `\W`, `\S` | Anything else |
| `^`, `$` | The start or end of the text |
| `\b`, `\B` | The edge of a word, or anywhere else |
| `x*`, `x+`, `x?` | Zero or more, one or more, or zero or one `x` |
| `x{n}`, `x{n,}`, `x{n,m}` | `n`, at least `n`, or between `n` and `m` of `x` |
| `x\|y` | `x` or `y` |
| `(x)` | A group, whose match you can read back |
| `(?:x)` | A group that isn't kept |
| `\n`, `\t`, `\u{1F600}` | A line break, a tab, or any character by its code |
| `(?i)` at the start | Letters in either case |

Repeats match as much as they can. Put `?` after one to match as little as it can instead:

```fckt
"a+?".toRegex().find("aaa")         // Some(Match(value=a, start=0, end=1, groups=[]))
"(?i)hello".toRegex().matches("HeLLo")   // true
```

A `\` before any other symbol matches that symbol, as in `\.` and `\(`. A `\` before a letter that
has no meaning, such as `\q`, is an error, so a typo doesn't quietly match something else.

## Functions

| Function | What it gives |
| --- | --- |
| `pattern.toRegex()` | The regex, or fails if the pattern is wrong |
| `regex(pattern)` | `Ok` with the regex, or `Error` with a `RegexError` |
| `escape(text)` | A pattern that matches `text` exactly |
| `r.find(text, from)` | The first match at or after `from`, if any |
| `r.findAll(text)` | Every match |
| `r.matches(text)` | Whether the whole text matches |
| `r.containsMatchIn(text)` | Whether there's a match anywhere |
| `r.replace(text, replacement)` | The text with each match replaced |
| `r.replaceWith(text) { m -> ... }` | The text with each match replaced by what the block gives |
| `r.split(text)` | The pieces between the matches |
| `m.group(n)` | What group `n` matched, if it took part |
