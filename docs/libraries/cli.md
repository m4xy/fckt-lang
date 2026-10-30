# Command-line arguments

[fk-cli](https://github.com/m4xy/fk-cli) reads the arguments a program is run with. You describe the
options and values your program takes, and fk-cli reads them into a type of your own, writes the
`--help` text, and explains what's wrong when the arguments don't fit.

## Add it to your project

List the library in your project's dependencies in `build.fk`:

```fckt
import uk.m4xy.kiln.fckt.Fckt

project = Project(
  name = "greet",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-cli:0.1.0")],
)

plugins = [Fckt()]
```

Then import it in your code:

```fckt
import uk.m4xy.cli.*
import uk.m4xy.cli.Arguments.*
```

## Describe a command

Start with a type that holds everything your program needs to know:

```fckt
type Greeting(names: List<String>, greeting: String, times: Int, loud: Boolean)
```

Then describe the command. A `Command` has a name, a one-line summary, and an `Arguments` block. Each
line of the block reads one option or value, and the last line builds your type from them:

```fckt
greet = Command("greet", "Says hello to each name you give it.", Arguments {
  greeting by optionOr("greeting", "WORD", "what to say", "Hello", short = Some('g'))
  times by optionOr("times", "N", "how many times to say it", "1", short = Some('n')).as(Arguments.int)
  loud by flag("loud", "shout it", short = Some('l'))
  names by arguments("NAME", "who to greet")
  Greeting(names, greeting, times, loud)
})
```

The lines don't depend on each other, so fk-cli checks all of them and reports every problem at
once, not just the first. [Collecting every error](/specs-and-functors#collecting-every-error)
explains how blocks like this one work.

## Run it

`Cli.run` reads the arguments and, if they fit, passes your value to the block:

```fckt
line(g: Greeting, name: String): String = {
  text = "${g.greeting}, $name!"
  if (g.loud) text.uppercase() else text
}

main(args: List<String>) = Cli.run(greet, args) { g ->
  g.names.forEach { name ->
    (1..g.times).forEach { println(line(g, name)) }
  }
}
```

```
$ greet Ada Grace
Hello, Ada!
Hello, Grace!
$ greet -g Hi -n 2 Ada
Hi, Ada!
Hi, Ada!
$ greet --loud --greeting=Morning Ada
MORNING, ADA!
```

When someone asks for help, `Cli.run` prints it and doesn't run your block:

```
$ greet --help
usage: greet [options] NAME...

Says hello to each name you give it.

arguments:
  NAME...              who to greet

options:
  -g, --greeting WORD  what to say (otherwise Hello)
  -n, --times N        how many times to say it (otherwise 1)
  -l, --loud           shout it
  -h, --help           show this help
```

When the arguments are wrong, it writes each problem and the usage line to standard error, and the
program stops with exit code 2:

```
$ greet --colour -n many Ada
greet: there's no option --colour
greet: expected a whole number, not 'many'
usage: greet [options] NAME...
try greet --help
```

## Options and values

Options have a long name, such as `--times`, and can have a one-letter name, such as `-n`. Values
are the arguments without a name, read in order.

| Function | Reads | Gives |
| --- | --- | --- |
| `flag(long, help, short)` | `--loud` | `true` if it's there |
| `option(long, valueName, help, short)` | `--out FILE` | `Some(value)`, or `None` |
| `optionOr(long, valueName, help, otherwise, short)` | `--times N` | The value, or `otherwise` |
| `required(long, valueName, help, short)` | `--mode MODE` | The value, which must be there |
| `repeated(long, valueName, help, short)` | `-x A -x B` | Every value given |
| `argument(name, help)` | `FROM` | The next value, which must be there |
| `optionalArgument(name, help)` | `[TO]` | The next value, if there is one |
| `arguments(name, help)` | `FILE...` | All the remaining values |

`short` is optional, and is written like `short = Some('n')`.

Options can come anywhere on the command line, in any of these forms:

```
--times 2    --times=2    -n 2    -n2
```

Flags can be written together, so `-ln2` is the same as `-l -n 2`. Everything after `--` is read as
a value, even if it starts with `-`.

### Values of other types

Options and values arrive as strings. To read one as something else, call `.as` with a function
that gives back a `Result`. `Arguments.int` reads a whole number:

```fckt
times by optionOr("times", "N", "how many times to say it", "1").as(Arguments.int)
```

You can write your own. Return `Error` with a message to report a problem:

```fckt
port(text: String): Result<Int, String> = when (text.toIntOrNone()) {
  Some(n) if n > 0 && n < 65536 -> Ok(n)
  else -> Error("expected a port number, not '$text'")
}
```

## Test a command

`Cli.read` reads the arguments without running anything or printing. It gives back one of three
cases:

- `Read(value)`, with your value
- `HelpAsked(help)`, with the help text
- `Wrong(problems, usage)`, with the list of problems and the usage line

That makes a command easy to check in a test:

```fckt
type Copy(from: String, to: Option<String>, exclude: List<String>, mode: String)

copy = Command("copy", "Copies a file.", Arguments {
  from by argument("FROM", "the file to copy")
  to by optionalArgument("TO", "where to copy it")
  exclude by repeated("exclude", "GLOB", "skip files that match", short = Some('x'))
  mode by required("mode", "MODE", "the new file's permissions")
  Copy(from, to, exclude, mode)
})

Cli.read(copy, ["a.txt", "--mode", "644", "-x", "*.o", "-x", "*.a"])
// Read(value=Copy(from=a.txt, to=None, exclude=[*.o, *.a], mode=644))

Cli.read(copy, [])
// Wrong(problems=[FROM is missing, --mode MODE is required], usage=usage: copy [options] FROM [TO])
```

## Functions

| Function | What it does |
| --- | --- |
| `Cli.run(command, args) { value -> ... }` | Runs the block with the value, or prints help or problems |
| `Cli.read(command, args)` | Reads the arguments into `Read`, `HelpAsked` or `Wrong` |
| `Cli.help(command)` | The help text |
| `Cli.usage(command)` | The one-line usage |
| `arg.as(read)` | Reads an option or value as another type |
| `Arguments.int` | Reads a whole number |
