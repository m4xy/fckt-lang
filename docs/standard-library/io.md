# Files and processes

The `fckt.io` package is how a program talks to the world outside it: the terminal, files and
folders, and other programs. Each of these is an [effect](/effects), so a function's type shows
which of them it uses, and a test can swap in a [handler](/handlers) of its own.

| Import | What it's for |
| --- | --- |
| `fckt.io.Console` | `print`, `println` and `readLine` on the terminal |
| `fckt.io.Paths.*` | Making paths and taking them apart |
| `fckt.io.Files.*` | Reading and writing files and folders |
| `fckt.io.Channels.*` | Reading a line at a time, standard input, and printing errors |
| `fckt.io.Processes` | Running other programs, and the environment |

## Console

`Console` is the effect for the terminal. It has `print`, `println` and `readLine`:

```fckt
import fckt.io.Console

@Console greet(): Unit = {
  print("What's your name? ")
  name = readLine()
  println("Hello, $name")
}
```

When `main` calls `greet`, `Console` is connected to the real terminal. In a test, you can answer
it yourself instead, and keep what it printed:

```fckt
import fckt.io.Console

@Console greet(): Unit = {
  print("What's your name? ")
  name = readLine()
  println("Hello, $name")
}

printed(): List<String> = {
  var lines: List<String> = []
  Console(print = s -> Unit, println = line -> { lines = lines + [line] }, readLine = ~"Ada") {
    greet()
  }
  lines
}

printed()                       // [Hello, Ada]
```

`println` only takes a `String`. To print anything else, put it in a string template:
`println("$total")`.

## Paths

A `Path` names a file or folder. The functions in `Paths` work on the path itself, and never look
at the disk:

```fckt
import fckt.io.Paths.*

p = path("src//main/./util/../Main.fk")

p                               // Path(value=src/main/Main.fk)
p.name                          // Main.fk
p.extension                     // fk
p.nameWithoutExtension          // Main
p.parent                        // Some(Path(value=src/main))
p.withExtension("ml")           // Path(value=src/main/Main.ml)
```

`path` tidies what you give it: extra slashes and `.` are dropped, and `..` takes off the name
before it. Two paths to the same place, written differently, end up equal.

To build a path from parts, use `resolve`. To go the other way and find where a path is inside a
folder, use `relativeTo`:

```fckt
import fckt.io.Paths.*

src = path("project/src")

src.resolve("Main.fk")                      // Path(value=project/src/Main.fk)
src.resolve("../build")                     // Path(value=project/build)
path("/a/b/c").relativeTo(path("/a"))       // Some(Path(value=b/c))
path("/x/y").relativeTo(path("/a"))         // None
"notes.txt".toPath().names                  // [notes.txt]
```

| Function | What it gives |
| --- | --- |
| `path(text)`, `text.toPath()` | A tidied path |
| `name`, `extension`, `nameWithoutExtension` | Parts of the last name |
| `names` | Every name in the path, in order |
| `parent` | The folder it's in, or `None` |
| `isAbsolute` | Whether it starts at `/` |
| `resolve(other)` | `other`, starting from this path |
| `withExtension(ext)` | The same path with another extension |
| `relativeTo(base)` | Where it is from `base`, if it's inside it |
| `value` | The path as a string |

## Files

The functions in `Files` read and write the disk. They use the `@FileSystem` effect:

```fckt
import fckt.io.Paths.*
import fckt.io.Files.*

dir = path("work")
dir.makeDirs()
notes = dir.resolve("notes.txt")

notes.writeText("first\n")
notes.appendText("second\n")
notes.exists()                  // true
notes.readLines()               // [first, second]
dir.listFiles().map { it.name } // [notes.txt]
dir.delete()
```

When something can't be done, such as reading a file that isn't there, the function
[fails](/standard-library/effects#failing) with the reason. Catch it with `attempt` if you want to
carry on:

```fckt
import fckt.io.Path
import fckt.io.FileSystem
import fckt.io.Paths.*
import fckt.io.Files.*
import fckt.effects.Failure.*

@FileSystem readOr(p: Path, fallback: String): String = when (attempt { p.readText() }) {
  Ok(text) -> text
  Error(_) -> fallback
}
```

`attempt` only catches the failure. `readOr` still reads the disk, so it's still `@FileSystem`.

| Function | What it does |
| --- | --- |
| `readText()`, `readLines()`, `readBytes()` | Reads the whole file |
| `writeText(text)`, `writeBytes(bytes)` | Replaces the file's contents, making it if needed |
| `appendText(text)`, `appendBytes(bytes)` | Adds to the end of the file |
| `exists()`, `isDirectory()` | Asks what's there |
| `listFiles()` | What's in a folder, sorted by name |
| `makeDirs()` | Makes a folder and any folders it's in |
| `delete()` | Deletes a file, or a folder and everything in it |
| `copyTo(target)`, `copyRecursively(target)` | Copies a file, or a whole folder |
| `lastModified()` | When the file last changed, as an [`Instant`](/standard-library/time) |
| `canonical()` | The full path, with links followed |
| `changeDirectory(folder)` | Changes the folder that relative paths start from |

### Reading and writing a piece at a time

`readText` reads a whole file at once. For a large file, open it around a block with `reading`
instead, and read it a line at a time:

```fckt
import fckt.io.Paths.*
import fckt.io.Files.*
import fckt.io.Channels.*

log = path("app.log")
log.writing {
  writeLine("started")
  writeLine("error: disk full")
  writeLine("stopped")
}

errors = log.reading {
  var found: List<String> = []
  forEachLine { if (it.startsWith("error")) found = found + [it] }
  found
}

errors                          // [error: disk full]
```

Inside a `reading` block you can call `nextLine`, `forEachLine`, `remainingLines` and
`remainingText`. Inside `writing` or `appending`, you can call `write` and `writeLine`. The file is
closed when the block ends, even if something in it fails.

## Standard input and errors

`Channels` gives you the program's standard input, output and error. To read everything that's
piped into the program, a line at a time, read from `standardInput`:

```fckt
import fckt.io.Console
import fckt.io.Channels.*

main() = {
  count = readingFrom(standardInput) {
    var lines = 0
    forEachLine { lines += 1 }
    lines
  }
  println("$count lines")
}
```

`printError` writes a line to standard error, so messages about what went wrong stay separate from
the program's real output:

```fckt
import fckt.io.Channels.*

main() = printError("warning: no config file, using defaults")
```

## Processes

`Processes.run` runs another program, waits for it to finish, and gives you its exit code and
everything it printed:

```fckt
import fckt.io.Processes

echoed = Processes.run("echo", ["hello from echo"])

echoed.code                     // 0
echoed.value.trim()             // hello from echo
```

The program runs directly, not through a shell, so each argument is passed exactly as you wrote it.
What it prints to standard error is mixed in with what it prints to standard output.

To handle the output while the program is still running, use `streaming`. Its block reads the
output the same way a `reading` block reads a file:

```fckt
import fckt.io.Processes
import fckt.io.Channels.*

listed = Processes.streaming("printf", ["a\nb\nc\n"]) {
  remainingLines().map { it.uppercase() }
}

listed.value                    // [A, B, C]
```

To run a program on your terminal, so that it prints straight to the screen and can ask the user
questions, use `runAttached`. It gives back the exit code.

The `Process` effect also has:

| Function | What it does |
| --- | --- |
| `env(name)` | An environment variable, or `None` |
| `setEnv(name, value)` | Sets an environment variable for this program and the ones it runs |
| `executable()` | The path of the running program |
| `exit(code)` | Ends the program with an exit code |

```fckt
import fckt.io.Process
import fckt.io.Processes

home = env("HOME").getOrElse("/")
setEnv("GREETING", "hi")
env("GREETING")                 // Some(hi)
```
