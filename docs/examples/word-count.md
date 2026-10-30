# Counting words

This program reads some text files and prints the ten words that appear most often, with how many
times each one appears:

```sh
$ words raven.txt
a        3
and      3
i        3
at       2
chamber  2
door     2
my       2
of       2
rapping  2
some     2
```

It only uses the standard library.

## The program

Make a project with this `build.fk`:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt

project = Project(name = "words", version = "0.1.0")

plugins = [Fckt()]
```

and put the whole program in `src/main.fk`:

```fckt
import fckt.collections.Maps.*
import fckt.effects.Failure.attempt
import fckt.io.Channels.*
import fckt.io.Console
import fckt.io.Files.*
import fckt.io.Paths.*

words(text: String): List<String> =
  text.lowercase()
    .toList()
    .map { if (it.isLetter() || it == '\'') "$it" else " " }
    .joinToString("")
    .split(" ")
    .map { it.removePrefix("'").removeSuffix("'") }
    .filter { it.isNotEmpty() }

counted(words: List<String>): Map<String, Int> =
  words.groupBy { it }.mapValues((_, same) -> same.size)

mostCommon(counts: Map<String, Int>, n: Int): List<(String, Int)> =
  counts.entries
    .sortedBy((word, _) -> word)
    .sortedByDescending((_, count) -> count)
    .take(n)

table(rows: List<(String, Int)>): List<String> = {
  width = rows.map((word, _) -> word.length).maxOrNone().getOrElse(0)
  rows.map((word, count) -> "${word.padEnd(width)}  $count")
}

main(args: List<String>) = {
  texts = args.mapNotNull { name ->
    when (attempt { path(name).readText() }) {
      Ok(text) -> Some(text)
      Error(why) -> {
        printError("words: $why")
        None
      }
    }
  }
  counts = counted(texts.flatMap { words(it) })
  table(mostCommon(counts, 10)).forEach { println(it) }
}
```

Build it with `kiln build`, and run it with `build/bin/words` followed by the files to read.

## Splitting text into words

`words` takes some text and gives back its words in lower case. It works in steps:

1. `toList()` turns the text into a list of characters.
2. Each letter is kept, and anything else becomes a space. Apostrophes are kept too, so that
   "don't" stays one word.
3. `joinToString("")` puts the characters back together, and `split(" ")` breaks the text at the
   spaces.
4. Apostrophes at the start or end of a word are removed, so `'Tis` and `'quoted'` lose their
   quotation marks.
5. Splitting leaves empty strings wherever there were two spaces in a row, so they're removed.

Each step is one call, so you can read the function from top to bottom.

## Counting

`groupBy` puts equal words together in a map, from each word to every time it appears. `mapValues`
then replaces each of those lists with its size:

```fckt
["the", "cat", "the"].groupBy { it }                                     // {cat=[cat], the=[the, the]}
["the", "cat", "the"].groupBy { it }.mapValues((_, same) -> same.size)   // {cat=1, the=2}
```

The block passed to `mapValues` takes two values, the word and its list. It only needs the list,
so the word is `_`.

## Picking the most common

`mostCommon` sorts twice. The first sort puts the words in alphabetical order. The second sorts by
count, highest first. Sorting keeps items that are equal in the order they were already in, so
words with the same count stay alphabetical. Without the first sort, the order of a tie would
depend on how the map happened to store them.

The map's `entries` are `(word, count)` pairs, so each block takes a pair apart and names the half
it uses.

## Printing a table

`table` finds the longest word, then pads every word to that length with `padEnd`, so the counts
line up in a column. `maxOrNone` gives `None` for an empty list, which happens when none of the
files had any words, and `getOrElse(0)` covers that case.

## Reading the files

`main` reads each file named on the command line. `readText()` fails if the file can't be read,
and `attempt` turns that into an `Error`. The program prints the reason and carries on with the
other files:

```sh
$ words raven.txt missing.txt
a        3
...
words: missing.txt: No such file or directory
```

`mapNotNull` keeps the `Some` values and drops the `None`s, so `texts` holds only the files that
were read.

Everything before `main` is pure. `words`, `counted`, `mostCommon` and `table` take values and
give back values, so you could test each one without any files.
