# A todo list

This program keeps a to-do list in a file called `todo.txt`. You add items, tick them off and
remove them from the command line, and it prints the list after each change:

```sh
$ todo add buy milk
1. [ ] buy milk
$ todo add write the docs
1. [ ] buy milk
2. [ ] write the docs
$ todo done 2
1. [ ] buy milk
2. [x] write the docs
$ todo remove 1
1. [x] write the docs
$ todo done 9
todo: there's no item 9
```

It only uses the standard library.

## The program

Make a project with this `build.fk`:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt

project = Project(name = "todo", version = "0.1.0")

plugins = [Fckt()]
```

and put the whole program in `src/main.fk`:

```fckt
import fckt.io.Channels.*
import fckt.io.Console
import fckt.io.FileSystem
import fckt.io.Files.*
import fckt.io.Path
import fckt.io.Paths.*
import fckt.io.Process

type Item(text: String, done: Boolean)

type Command {
  Add(text: String)
  Done(number: Int)
  Remove(number: Int)
  Show
}

commandOf(args: List<String>): Result<Command, String> = when (args) {
  [] -> Ok(Show)
  ["add", *words] if words.isNotEmpty() -> Ok(Add(words.joinToString(" ")))
  ["done", number] -> numberFrom(number).map { Done(it) }
  ["remove", number] -> numberFrom(number).map { Remove(it) }
  else -> Error("usage: todo [add TEXT | done N | remove N]")
}

numberFrom(text: String): Result<Int, String> = when (text.toIntOrNone()) {
  Some(n) -> Ok(n)
  None -> Error("'$text' isn't a number")
}

applied(command: Command, items: List<Item>): Result<List<Item>, String> = when (command) {
  is Add -> Ok(items + [Item(command.text, false)])
  is Done -> itemIndex(items, command.number).map { index ->
    items.withIndex().map { i, item -> if (i == index) item.copy(done = true) else item }
  }
  is Remove -> itemIndex(items, command.number).map { index ->
    items.withIndex().filter { i, _ -> i != index }.map { _, item -> item }
  }
  is Show -> Ok(items)
}

itemIndex(items: List<Item>, number: Int): Result<Int, String> =
  if (number >= 1 && number <= items.size) Ok(number - 1) else Error("there's no item $number")

itemOf(line: String): Item = Item(line.drop(4), line.startsWith("[x]"))

lineOf(item: Item): String = (if (item.done) "[x] " else "[ ] ") + item.text

shown(items: List<Item>): List<String> =
  items.withIndex().map { i, item -> "${i + 1}. ${lineOf(item)}" }

@FileSystem load(file: Path): List<Item> =
  if (file.exists()) file.readLines().map { itemOf(it) } else []

@FileSystem save(file: Path, items: List<Item>): Unit =
  file.writeText(items.map { lineOf(it) + "\n" }.joinToString(""))

main(args: List<String>) = {
  file = path("todo.txt")
  result = commandOf(args).flatMap { command -> applied(command, load(file)) }
  when (result) {
    Ok(items) -> {
      save(file, items)
      shown(items).forEach { println(it) }
    }
    Error(problem) -> {
      printError("todo: $problem")
      exit(2)
    }
  }
}
```

Build it with `kiln build`, and run it with `build/bin/todo`.

## Commands as a type

Each thing you can ask the program to do is a case of `Command`. Turning the command line into a
`Command` first means the rest of the program never looks at raw strings again.

`commandOf` matches the arguments as a list:

- `[]` is no arguments at all, which shows the list.
- `["add", *words]` is `add` followed by anything. `*words` collects the rest, so
  `todo add buy milk` works without quotes. The guard `if words.isNotEmpty()` rejects a bare
  `todo add`.
- `["done", number]` is `done` followed by exactly one more argument.
- `else` catches everything else and gives back the usage.

`numberFrom` can fail too, if the argument isn't a number. Both functions give back a `Result`, so
`map` turns a number into a command only when there is one:

```fckt
numberFrom("2").map { Done(it) }     // Ok(Done(number=2))
numberFrom("two").map { Done(it) }   // Error('two' isn't a number)
```

## Changing the list

`applied` takes a command and the current items, and gives back the new items. It never changes
the old list. `done` builds a new list with one item replaced, using `copy` to make that item with
`done` set to `true`. `remove` builds a new list without that item.

Numbers on the screen start at 1, but list positions start at 0. `itemIndex` converts between the
two, and gives back an error when the number is out of range, so `done` and `remove` share the
check.

## The file format

The file stores one item per line, in the same form the program prints:

```
[x] write the docs
[ ] water the plants
```

`lineOf` writes an item as a line, and `itemOf` reads one back. Because the format is plain text,
you can also edit the file by hand.

## Reading and writing

`load` and `save` are the only functions that touch the disk, and they say so with `@FileSystem`.
If `todo.txt` doesn't exist yet, `load` starts with an empty list.

`main` puts the steps together. `flatMap` chains the two steps that can fail: reading the command,
then applying it. If either gives back an `Error`, the program prints it to standard error and
exits with code 2. Otherwise it saves the new list and prints it.

Everything other than `load`, `save` and `main` is pure. You can see that from the declarations:
none of the other functions are marked with an effect.
