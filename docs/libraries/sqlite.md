# SQLite

[fk-sqlite](https://github.com/m4xy/fk-sqlite) stores and reads data in an
[SQLite](https://sqlite.org) database, either a single file or one held in memory. Your code runs
SQL through an effect, `@Database`, so a function's type shows whether it touches the database. Rows
come back as values of your own types.

## Add it to your project

fk-sqlite calls SQLite through an OCaml package, so install that first:

```sh
opam install sqlite3
```

Then list the library in your dependencies, and tell kiln to link the package. Linking is set in a
module that follows `FcktConfiguration`, which you pass to the `Fckt` plugin:

```fckt
import uk.m4xy.kiln.fckt.*

project = Project(
  name = "notes",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-sqlite:0.1.0")],
)

module WithSqlite : FcktConfiguration {
  layout(): FcktLayout = FcktLayout(ocamlPackages = ["sqlite3"])
}

plugins = [Fckt(WithSqlite)]
```

If you also use fk-tests, pass the same module to it: `FkTests(StandardTests, WithSqlite)`.

In your code, import:

```fckt
import uk.m4xy.sql.*
import uk.m4xy.sql.Columns.*
import uk.m4xy.sql.Databases.*
```

## Open a database

`Databases.opening` opens a database, runs the block, and closes the database afterwards, even if
the block fails. Pass a file name, or `":memory:"` for a database that disappears when it's closed.
If the file doesn't exist, SQLite creates it:

```fckt
schema = "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT, done INTEGER NOT NULL DEFAULT 0)"

main() = Databases.opening("notes.db") {
  script(schema)
  add("Buy milk", None)
  println("${unfinished().size} to do")
}
```

`script` runs SQL that doesn't need any values, such as creating tables. It can hold several
statements separated by `;`.

## Run SQL

Functions that use the database are marked `@Database`. Running SQL can fail, for example when a
table doesn't exist, so they're also marked `@Fail`:

```fckt
@Database @Fail add(title: String, body: Option<String>): Int =
  insert("INSERT INTO notes (title, body) VALUES (?, ?)", [Text(title), body.map { Text(it) }.getOrElse(Null)])

@Database @Fail finish(id: Int): Boolean =
  execute("UPDATE notes SET done = 1 WHERE id = ?", [Integer(id)]) == 1
```

`insert` gives back the ID of the new row. `execute` gives back how many rows changed.

Each `?` in the SQL is filled with the next value from the list. A value is one of:

| Value | SQLite type |
| --- | --- |
| `Null` | `NULL` |
| `Integer(n)` | `INTEGER` |
| `Real(x)` | `REAL` |
| `Text(s)` | `TEXT` |
| `Blob(bytes)` | `BLOB` |

The values are sent to SQLite separately from the SQL, never pasted into it. So a title like
`x'); DROP TABLE notes; --` is stored as text and can't change what the SQL does.

When SQLite can't run something, the function fails with SQLite's reason and the SQL:

```fckt
attempt { query("SELECT * FROM nowhere") }
// Error(no such table: nowhere, in: SELECT * FROM nowhere)
```

## Read rows into your own types

Describe how to read a row with a `Columns` block. Each line reads one column by name, and the last
line builds your value:

```fckt
type Note(id: Int, title: String, body: Option<String>, done: Boolean)

notes: Column<Note> = Columns {
  id by int("id")
  title by text("title")
  body by nullable(text("body"))
  done by boolean("done")
  Note(id, title, body, done)
}
```

Then pass it to `queryAs` for a list of rows, or to `queryOne` for the first row, if there is one:

```fckt
@Database @Fail unfinished(): List<Note> =
  queryAs(notes, "SELECT * FROM notes WHERE NOT done ORDER BY id")

@Database @Fail note(id: Int): Option<Note> =
  queryOne(notes, "SELECT * FROM notes WHERE id = ?", [Integer(id)])
```

For a single column, you don't need a block:

```fckt
queryAs(int("n"), "SELECT count(*) AS n FROM notes")    // [2]
```

| Column | Reads |
| --- | --- |
| `int(name)` | An `INTEGER` as an `Int` |
| `real(name)` | A `REAL`, or an `INTEGER`, as a `Float` |
| `text(name)` | A `TEXT` as a `String` |
| `blob(name)` | A `BLOB` as `Bytes` |
| `boolean(name)` | `0` or `1` as a `Boolean` |
| `value(name)` | Whatever's there, as a `Value` |
| `nullable(column)` | `None` for `NULL`, otherwise `Some` of the column |

If a row doesn't fit, the query fails with every problem in it, not just the first:

```
column title is the text 'Buy milk', not an integer; there's no column missing, reading a row of: SELECT * FROM notes
```

## Transactions

`transaction` keeps the changes made inside it only if the whole block finishes. If anything in it
fails, every change it made is undone:

```fckt
attempt {
  transaction {
    add("Never kept", None)
    fail("changed my mind")
  }
}
// Error(changed my mind), and the note isn't saved
```

## Test code that uses a database

A function marked `@Database` doesn't care which database it runs on, so a test can open one in
memory:

```fckt
@Test @SqlEngine @Fail finishedNotesAreHidden() = Databases.opening(":memory:") {
  script(schema)
  milk = add("Buy milk", None)
  add("Write docs", None)
  finish(milk)
  assertEquals(["Write docs"], unfinished().map { it.title })
}
```

`@SqlEngine` is the effect underneath `@Database` that talks to SQLite. `main` gets it
automatically, but a test that opens a database declares it.

You can also skip SQLite and [handle](/handlers) `Database` yourself. This handler records each
statement instead of running it, and says that one row changed:

```fckt
@Test @Fail finishingRunsOneUpdate() = {
  ran: Mutable<List<Statement>> = Mutable([])
  Database(
    tryRun = statement -> {
      ran.value = ran.value + [statement]
      Ok(Executed([], 1, 0))
    },
    tryRunScript = sql -> Ok(Unit),
  ) {
    assertEquals(true, finish(7))
  }
  assertEquals([Statement("UPDATE notes SET done = 1 WHERE id = ?", [Integer(7)])], ran.value)
}
```

## Functions

| Function | What it does |
| --- | --- |
| `Databases.opening(path) { ... }` | Opens the database, runs the block, then closes it |
| `query(sql, values)` | Runs a query and gives the rows as `Row`s |
| `queryAs(columns, sql, values)` | Runs a query and reads each row with `columns` |
| `queryOne(columns, sql, values)` | Like `queryAs`, but gives only the first row, if any |
| `execute(sql, values)` | Runs a statement and gives how many rows changed |
| `insert(sql, values)` | Runs a statement and gives the new row's ID |
| `script(sql)` | Runs one or more statements that take no values |
| `transaction { ... }` | Keeps the block's changes only if it finishes |
