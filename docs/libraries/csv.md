# CSV

[fk-csv](https://github.com/m4xy/fk-csv) reads and writes CSV, the comma-separated text that
spreadsheets and databases export. It follows RFC 4180, the standard description of the format.

## Add it to your project

```fckt
project = Project(
  name = "report",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-csv:0.1.0")],
)
```

## Read rows

`Csv.parse` gives each row as a list of its fields:

```fckt
import uk.m4xy.csv.Csv

Csv.parse("name,age\nAda,36\nBo,7\n")
// Ok([["name", "age"], ["Ada", "36"], ["Bo", "7"]])
```

A field in double quotes can contain commas, line breaks, and quotes, which are written twice
inside it. Lines can end with `\n` or `\r\n`, and the last line doesn't need to end at all. If the
text isn't CSV, for example because a quoted field is never closed, `Csv.parse` gives an `Error`
with a `CsvError` saying what's wrong and on which line.

## Read records

When the first row names the columns, `Csv.records` gives each of the other rows as pairs of a
column's name and the field, and `Csv.field` picks one out:

```fckt
when (Csv.records("name,age\nAda,36\n")) {
  Ok(records) -> records.forEach { record ->
    println(Csv.field(record, "name").getOrElse("someone"))
  }
  Error(problem) -> println("line ${problem.line}: ${problem.message}")
}
```

A row with more or fewer fields than the first is an error, so a missing column is noticed rather
than read as the wrong one.

## Write rows

`Csv.write` writes rows, putting a field in quotes only when it needs them:

```fckt
Csv.write([["id", "note"], ["1", "with, comma"]])
```

gives

```
id,note
1,"with, comma"
```

Each function takes another separator if you give it one, such as `';'`, which many spreadsheets
use, and `Csv.write` can end lines with `"\r\n"` as RFC 4180 does.
