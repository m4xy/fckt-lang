# Logging

[fk-log](https://github.com/m4xy/fk-log) records what a program does as it runs. Logging is an
effect, so the code that logs says what happened, and whatever runs it decides where the log goes:
to the terminal, as JSON for a log collector, or into a list a test can check.

## Add it to your project

```fckt
project = Project(
  name = "service",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-log:0.1.0")],
)
```

Then import it. The core already has a function called `error`, which stops a program, so import
fk-log's by name to use it:

```fckt
import uk.m4xy.log.*
import uk.m4xy.log.Logs.*
import uk.m4xy.log.Logs.error
```

## Log what happens

`debug`, `info`, `warn` and `error` each log a message, with any facts about it as pairs of a
name and a value:

```fckt
@Log signIn(name: String): Unit = {
  info("signed in", [("user", name)])
}
```

`withFields` adds fields to everything logged inside its block. It's useful for something like a
request's id, which you want on every line logged while the request is answered:

```fckt
withFields([("request", requestId)]) {
  info("answered", [("status", "200")])
}
```

## Choose where it goes

`toStandardError` writes each entry to standard error, with the time from the `Clock`. You give it
the lowest level to keep and a format: `Text` for people to read, or `JsonLines` for a program
that collects logs:

```fckt
main() = toStandardError(Info, Text) {
  signIn("ada")
}
```

prints

```
2026-10-31T09:30:00.250Z INFO signed in user=ada
```

and with `JsonLines`:

```
{"time":"2026-10-31T09:30:00.250Z","level":"info","message":"signed in","user":"ada"}
```

## Check it in a test

`collected` runs a block and gives back what the block gave and everything it logged, so a test
can check what was logged the same way it checks anything else:

```fckt
@Test signingInIsLogged() = {
  (_, entries) = collected { signIn("ada") }
  assertEquals([Entry(Info, "signed in", [("user", "ada")])], entries)
}
```
