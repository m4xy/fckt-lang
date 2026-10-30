# A command-line tool

This page builds a small version of grep, a program that prints the lines of a file that match a
pattern:

```sh
$ grep -n cat poem.txt
1:The cat sat
3:a concatenated
```

It uses two libraries: [fk-regex](/libraries/regex) for the patterns and [fk-cli](/libraries/cli)
to read the command line. The program is split in two:

- a `Grep` module that works out which lines match. It doesn't read files or print anything, so
  it's easy to test.
- a short `main` that reads the files, hands their lines to `Grep`, and prints the result.

## Set up the project

Make a folder with this layout:

```
grep/
  build.fk
  settings.fk
  src/
    main.fk
    grep/
      Search.fk
      Source.fk
      Grep.fk
  test/
    grep.fk
```

`build.fk` names the project and the two libraries it uses:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt
import uk.m4xy.fktests.kiln.*

project = Project(
  name = "grep",
  version = "0.1.0",
  dependencies = [
    library("uk.m4xy:fk-regex:0.1.0"),
    library("uk.m4xy:fk-cli:0.1.0"),
  ],
)

plugins = [Fckt(), FkTests()]
```

`FkTests` adds a `test` task, and `settings.fk` tells kiln where to find it:

```fckt
// settings.fk
settings = Settings(uses = [library("uk.m4xy:fk-tests-kiln:0.1.0")])
```

[Building with kiln](/kiln) explains these files in more detail.

## Describe a search

A search has a pattern, some files and a few options. Give it a type of its own in
`src/grep/Search.fk`:

```fckt
type Search(
  pattern: String,
  files: List<String>,
  ignoreCase: Boolean,
  invert: Boolean,
  lineNumbers: Boolean,
)
```

The text being searched also gets a type, in `src/grep/Source.fk`. It has a name, which is printed
before each line when there's more than one file, and the lines themselves:

```fckt
type Source(name: String, lines: List<String>)
```

## Read the command line

fk-cli turns the command line into a `Search`. You list what the program takes, one thing per line,
and the last line builds the value from them:

```fckt
// src/grep/Grep.fk
import uk.m4xy.cli.*
import uk.m4xy.cli.Arguments.*
import uk.m4xy.regex.*
import uk.m4xy.regex.Regexes.*

module Grep {
  command: Command<Search> = Command(
    "grep",
    "Prints the lines of each file, or of standard input, that match a pattern.",
    Arguments {
      ignoreCase by flag("ignore-case", "match letters in either case", short = Some('i'))
      invert by flag("invert-match", "print the lines that don't match", short = Some('v'))
      lineNumbers by flag("line-number", "put each line's number before it", short = Some('n'))
      pattern by argument("PATTERN", "the regular expression to look for")
      files by arguments("FILE", "the files to search")
      Search(pattern, files, ignoreCase, invert, lineNumbers)
    },
  )
```

- `flag` is an option that's either there or not, like `-i`.
- `argument` is a value given by position. It has to be there.
- `arguments` collects every value that's left, so `files` can be empty.

fk-cli writes the help from these descriptions, so `--help` works without any more code:

```
$ grep --help
usage: grep [options] PATTERN FILE...

Prints the lines of each file, or of standard input, that match a pattern.

arguments:
  PATTERN             the regular expression to look for
  FILE...             the files to search

options:
  -i, --ignore-case   match letters in either case
  -v, --invert-match  print the lines that don't match
  -n, --line-number   put each line's number before it
  -h, --help          show this help
```

## Find the matching lines

The rest of `Grep` does the searching. First, the pattern becomes a regular expression. fk-regex
ignores case when a pattern starts with `(?i)`, so `-i` only has to add that:

```fckt
  regexOf(search: Search): Result<Regex, RegexError> =
    regex(if (search.ignoreCase) "(?i)${search.pattern}" else search.pattern)
```

`regex` gives back an `Error` if the pattern isn't valid, such as `(ab` with no closing bracket.
`main` will report it.

Then `matching` goes through the lines of one source:

```fckt
  matching(search: Search, regex: Regex, source: Source): List<String> = {
    numbered = source.lines.withIndex().map { i, line -> (i + 1, line) }
    hits = numbered.filter { _, line -> regex.containsMatchIn(line) != search.invert }
    hits.map { number, line -> prefix(search, source, number) + line }
  }

  private prefix(search: Search, source: Source, number: Int): String = {
    name = if (search.files.size > 1) "${source.name}:" else ""
    lineNumber = if (search.lineNumbers) "$number:" else ""
    name + lineNumber
  }
}
```

- Each line is paired with its number first, counting from 1, so the number is still there after
  the filter.
- `containsMatchIn(line) != search.invert` keeps matching lines normally, and the lines that don't
  match when `-v` is given.
- `prefix` is private, because nothing outside `Grep` needs it.

Everything in `Grep` is pure: given the same search and the same lines, it always gives the same
answer.

## Read the files

`main` is where the program meets the outside world. It reads the files, prints what `Grep` found,
and decides the exit code:

```fckt
// src/main.fk
import uk.m4xy.cli.*
import grep.*
import fckt.effects.Failure.attempt
import fckt.io.Channels.*
import fckt.io.Console
import fckt.io.Files.*
import fckt.io.Paths.*
import fckt.io.Process

main(args: List<String>) = Cli.run(Grep.command, args) { search ->
  when (Grep.regexOf(search)) {
    Error(problem) -> {
      printError("grep: ${problem.message}")
      exit(2)
    }
    Ok(regex) -> {
      sources = if (search.files.isEmpty()) {
        [Ok(Source("(standard input)", readingFrom(standardInput) { remainingLines() }))]
      } else {
        search.files.map { name -> attempt { Source(name, path(name).readLines()) } }
      }
      found = sources.flatMap { source ->
        when (source) {
          Ok(s) -> Grep.matching(search, regex, s)
          Error(why) -> {
            printError("grep: $why")
            []
          }
        }
      }
      found.forEach { println(it) }
      exit(if (found.isEmpty()) 1 else 0)
    }
  }
}
```

- `Cli.run` reads the command line and calls the block with the `Search`. If something's wrong
  with the command line, it prints the problem and the usage and exits with code 2, so the block
  only runs with a valid search.
- With no files, the lines come from standard input. `readingFrom(standardInput)` opens it for the
  block, and `remainingLines()` reads everything.
- `readLines()` fails if a file can't be read. `attempt` catches that and turns it into an
  `Error` with the reason, so one missing file doesn't stop the others from being searched.
- grep exits with 0 if a line matched and 1 if none did. Scripts rely on that, so this program
  does the same.

`main` doesn't declare its effects, but every other function does. Since `Grep`'s functions don't
declare any, you can tell from their types alone that they don't touch files or the terminal.
[Effects](/effects) has more on this.

## Test it

Because `Grep` only works on values, the tests don't need any files. Put a poem in memory and
search it, in `test/grep.fk`:

```fckt
import uk.m4xy.fktests.api.Test
import uk.m4xy.cli.*
import grep.*
import fckt.effects.Fail

poem = Source("poem.txt", ["The cat sat", "on the mat;", "a concatenated", "CAT."])

@Fail grep(args: List<String>): List<String> = when (Cli.read(Grep.command, args + [poem.name])) {
  Read(search) -> when (Grep.regexOf(search)) {
    Ok(regex) -> Grep.matching(search, regex, poem)
    Error(problem) -> fail(problem.message)
  }
  other -> fail("$other")
}

@Test @Fail printsTheLinesThatMatch() = assertEquals(["The cat sat", "a concatenated"], grep(["cat"]))

@Test @Fail ignoringCase() = assertEquals(["The cat sat", "a concatenated", "CAT."], grep(["-i", "cat"]))

@Test @Fail inverting() = assertEquals(["on the mat;", "CAT."], grep(["-v", "cat"]))

@Test @Fail numbering() = assertEquals(["2:on the mat;"], grep(["-n", "mat"]))
```

The helper `grep` takes the same arguments the program would, so each test reads like a command.
`Cli.read` is the part of `Cli.run` that only reads: it gives back `Read(search)` instead of
running anything. The helper uses `fail` when something goes wrong, so it's marked `@Fail`, and so
are the tests that call it. [Testing](/testing) covers fk-tests in more detail.

## Build and run

`kiln build` compiles the program and runs the tests:

```
$ kiln build
> Task :compile
> Task :test
  grep.fk
    passed printsTheLinesThatMatch
    passed ignoringCase
    passed inverting
    passed numbering
  4 passed, 0 failed
> Task :check
> Task :build
BUILD SUCCESSFUL
```

The program is in `build/bin/grep`:

```sh
$ build/bin/grep -i cat poem.txt pets.txt
poem.txt:The cat sat
poem.txt:a concatenated
poem.txt:CAT.
pets.txt:cats and dogs

$ printf 'one\ntwo\n' | build/bin/grep -v one
two

$ build/bin/grep '(ab' poem.txt
grep: this ( is never closed
```

## Going further

[fk-grep](https://github.com/m4xy/fk-grep) is the same program with more of grep's options: `-F`
for plain text, `-w` for whole words, `-c` to count, `-o` for only the matching parts and `-l` for
file names. It keeps the same shape, with a pure `Grep` module and a short `main`, and each option
is a few more lines in each.
