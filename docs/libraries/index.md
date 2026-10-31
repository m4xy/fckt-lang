# Libraries

These libraries aren't part of the standard library. You add each one to a project with
[kiln](/kiln), and they're all on GitHub.

| Library | What it's for |
| --- | --- |
| [HTTP](/libraries/http) | An HTTP client and server, with routing, JSON bodies and in-memory testing. |
| [Serialization](/libraries/serialization) | Turning your types into JSON and reading them back. |
| [SQLite](/libraries/sqlite) | Storing data in an SQLite database through the `@Database` effect. |
| [Regular expressions](/libraries/regex) | Finding, replacing and splitting text by pattern. |
| [Command-line arguments](/libraries/cli) | Reading a program's options and arguments, with generated `--help`. |
| [HTML](/libraries/html) | Building HTML pages as code, with text escaped for you. |
| [Markdown](/libraries/markdown) | Turning Markdown into HTML. |
| [Dates and times](/libraries/time) | Calendar dates, weekdays, time zones as offsets, and ISO 8601. |
| [Logging](/libraries/log) | Logging as an effect, to the terminal, as JSON, or into a test. |
| [Testing](/testing) | Writing and running tests with fk-tests. |

To see several of them working together, read [A web service](/examples/url-shortener), which
builds a URL shortener from HTTP, SQLite, serialization and regular expressions.
