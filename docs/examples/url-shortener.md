# A web service

This walkthrough goes through [fk-links](https://github.com/m4xy/fk-links), a small service that
shortens links. You send it a long URL, it gives you back a short name, and visiting that name
redirects you to the original URL. It stores links in SQLite and talks JSON over HTTP.

It's built from several of fckt's libraries:

- [fk-http](/libraries/http) serves the requests.
- [fk-sqlite](/libraries/sqlite) stores the links.
- [fk-serialization](/libraries/serialization) reads and writes the JSON.
- fk-regex checks the URLs and names it's given.
- fk-cli reads the command line.

The whole service is about 600 lines, tests included.

## What it does

```
$ kiln build
$ build/bin/fk-links --port 8080 --database links.db
fk-links: serving links from links.db on port 8080
```

In another terminal:

```
$ curl -XPOST localhost:8080/links -d '{"url": "https://ocaml.org", "slug": "ocaml"}'
{"slug":"ocaml","url":"https://ocaml.org","visits":0}

$ curl -i localhost:8080/ocaml
HTTP/1.1 302 Found
Location: https://ocaml.org

$ curl localhost:8080/links/ocaml
{"slug":"ocaml","url":"https://ocaml.org","visits":1}
```

If you don't ask for a name, the service makes one up by counting in base 62: `1`, `2`, and so on
up to `Z`, then `10`. These are all the routes:

| Route | What it does |
| --- | --- |
| `POST /links` | Makes a link. Answers 201, 409 if the name is taken, or 422 if the URL or name isn't allowed. |
| `GET /links` | Lists every link, newest first. |
| `GET /links/{slug}` | Shows one link and how many times it's been followed. |
| `DELETE /links/{slug}` | Deletes a link. Answers 204. |
| `GET /{slug}` | Redirects to the link's URL and counts the visit. |
| `GET /health` | Answers 200 while the service is up. |
| `GET /openapi.json` | Describes the API as an OpenAPI document, made from the routes. |

## How the code is laid out

The code is split into four packages, or layers. Each layer uses only the ones above it in this
list:

| Package | What's in it |
| --- | --- |
| `uk.m4xy.links.domain` | What a link is, and the rules about which links are valid. |
| `uk.m4xy.links.application` | One module for each thing the service can do: shorten, follow, show, list and delete. |
| `uk.m4xy.links.infrastructure` | The two ways of storing links: in SQLite and in memory. |
| `uk.m4xy.links.presentation` | The HTTP routes and the JSON they read and write. |

The domain and application layers don't know about HTTP, JSON or SQL. They describe what they need
from storage with an effect, and the infrastructure layer handles that effect. The rest of this
page goes through the layers in order.

## The domain

A link has a short name, which the code calls a slug, a target URL and a count of visits:

```fckt
type Link(slug: Slug, target: TargetUrl, visits: Int)
```

`Slug` and `TargetUrl` wrap a `String`, but their constructors are
[private](/types#private-constructors):

```fckt
type Slug private(text: String)
type TargetUrl private(text: String)
```

That means the only way to get one is through the modules in the domain package, which check the
text first. Any `Slug` you're holding has already passed those checks. Here's `TargetUrls`, which
accepts only `http` and `https` URLs:

```fckt
import uk.m4xy.regex.*
import uk.m4xy.regex.Regexes.*

module TargetUrls {
  parsed(text: String): Result<TargetUrl, LinkProblem> = if (urls.matches(text)) Ok(TargetUrl(text)) else Error(InvalidUrl(text))

  private urls: Regex = Patterns.compiled("https?://[^\\s/?#]+[^\\s]*")
}
```

`parsed` gives back a `Result`: the URL if it's valid, or a `LinkProblem` if it isn't.
`LinkProblem` lists everything that can go wrong in the service:

```fckt
type LinkProblem {
  InvalidUrl(url: String),
  InvalidSlug(slug: String),
  SlugTaken(slug: Slug),
  NoSuchLink(slug: String),
}
```

Nothing in the domain says how these problems reach the user. Turning them into HTTP statuses is
the presentation layer's job.

### What the domain needs from storage

The domain needs somewhere to keep links, but it shouldn't care whether that's a database or a
list in memory. So it declares an [effect](/effects#effects-with-operations) with the operations it
needs:

```fckt
effect LinkRepository {
  linkNamed(slug: Slug): Option<Link>
  newestFirst(): List<Link>
  nextNumber(): Int
  add(link: Link): Unit
  replace(link: Link): Unit
  remove(slug: Slug): Boolean
}
```

Any function that reads or writes links is marked `@LinkRepository`. Which storage it actually uses
is decided by whichever [handler](/handlers) it runs inside.

## The application

Each thing the service can do is a module with one function, `execute`. Here's showing a link:

```fckt
module ShowLink {
  @LinkRepository execute(slug: String): Result<Link, LinkProblem> = linkCalled(slug)
}
```

`linkCalled` is a helper shared by a few of these modules. It checks the name, then asks the
repository for the link:

```fckt
@LinkRepository linkCalled(slug: String): Result<Link, LinkProblem> = when (Slugs.read(slug).flatMap { linkNamed(it) }) {
  Some(link) -> Ok(link)
  None -> Error(NoSuchLink(slug))
}
```

`linkNamed` is the operation from `LinkRepository`. It's called like an ordinary function, and the
`@LinkRepository` at the start of the declaration is what lets this function call it.

### Changes that belong together

Following a link reads it, then writes it back with one more visit. If two people follow the same
link at once, both could read the same count, and one visit would be lost. The read and the write
need to happen together, as one change.

The application declares a second effect for this:

```fckt
effect UnitOfWork {
  atomically<A>(work: @LinkRepository () -> A): A
}
```

`atomically` runs a block that uses the repository and makes sure its changes happen as one.
`FollowLink` puts its read and its write inside it:

```fckt
import uk.m4xy.links.domain.*
import uk.m4xy.links.domain.Links.*

module FollowLink {
  @UnitOfWork execute(slug: String): Result<TargetUrl, LinkProblem> = atomically {
    linkCalled(slug).map { link ->
      replace(link.visited())
      link.target
    }
  }
}
```

`visited` comes from the domain. It gives back a copy of the link with the count one higher:

```fckt
module Links {
  created(slug: Slug, target: TargetUrl): Link = Link(slug, target, 0)

  Link.visited(): Link = this.copy(visits = this.visits + 1)
}
```

Notice that `FollowLink.execute` is marked only `@UnitOfWork`. It has no `@LinkRepository` of its
own, because it only uses the repository inside the block it passes to `atomically`.

### Shortening a link

`ShortenLink` is the longest use case. It checks the URL, then either uses the name the caller
asked for or makes a new one:

```fckt
import uk.m4xy.links.domain.*

module ShortenLink {
  type Request(url: String, slug: Option<String> = None)

  @UnitOfWork execute(request: Request): Result<Link, LinkProblem> =
    TargetUrls.parsed(request.url).flatMap { target ->
      when (request.slug) {
        Some(asked) -> Slugs.asked(asked).flatMap { slug -> atomically { addedAs(slug, target) } }
        None -> Ok(atomically { added(Links.created(freeSlug(nextNumber(), 0), target)) })
      }
    }

  private addedAs(slug: Slug, target: TargetUrl): Result<Link, LinkProblem> =
    if (linkNamed(slug).isSome()) Error(SlugTaken(slug)) else Ok(added(Links.created(slug, target)))

  private added(link: Link): Link = {
    add(link)
    link
  }

  private freeSlug(number: Int, attempt: Int): Slug = {
    slug = Slugs.made(number, attempt)
    if (linkNamed(slug).isSome()) freeSlug(number, attempt + 1) else slug
  }
}
```

A made-up name might already be taken by someone who asked for that exact name. `freeSlug` tries
`2`, then `2-1`, `2-2` and so on until it finds one that's free.

The private functions don't declare their effects. fckt works them out from the body, so
`addedAs`, `added` and `freeSlug` are treated as `@LinkRepository` because they call its
operations.

## Storing the links

The infrastructure layer handles the two effects, once for SQLite and once for memory.

### In SQLite

A module that follows an effect is a handler for it, as described in
[Handling with a module](/handlers#handling-with-a-module). `SqliteLinks` follows `LinkRepository`
and answers each operation with a SQL query, using fk-sqlite:

```fckt
import fckt.effects.Fail
import uk.m4xy.links.domain.*
import uk.m4xy.sql.*
import uk.m4xy.sql.Columns.*
import uk.m4xy.sql.Databases.*

@Database @Fail module SqliteLinks : LinkRepository {
  linkNamed(slug: Slug): Option<Link> =
    queryOne(rows, "SELECT slug, url, visits FROM links WHERE slug = ?", [Text(slug.text)]).map { linkOf(it) }

  newestFirst(): List<Link> =
    queryAs(rows, "SELECT slug, url, visits FROM links ORDER BY id DESC").map { linkOf(it) }

  remove(slug: Slug): Boolean = execute("DELETE FROM links WHERE slug = ?", [Text(slug.text)]) > 0

  // nextNumber, add and replace are written the same way.

  private type Row(slug: String, url: String, visits: Int)

  private rows: Column<Row> = Columns {
    slug by text("slug")
    url by text("url")
    visits by int("visits")
    Row(slug, url, visits)
  }

  private linkOf(row: Row): Link = when (Slugs.read(row.slug), TargetUrls.parsed(row.url)) {
    (Some(slug), Ok(target)) -> Link(slug, target, row.visits)
    _ -> fail("the links table has a row the service couldn't have made: ${row.slug} -> ${row.url}")
  }
}
```

The `@Database @Fail` before `module` says what the handler itself needs: an open database, and a
way to fail. `rows` describes how to read a row into a `Row`, column by column. `linkOf` turns a
row back into a `Link`, going through `Slugs` and `TargetUrls` like any other code has to.

The SQLite handler for `UnitOfWork` runs the block in a database transaction:

```fckt
@Database @Fail @LinkRepository module SqliteTransactions : UnitOfWork {
  atomically<A>(work: @LinkRepository () -> A): A = transaction { work() }
}
```

`SqliteStore` puts the two handlers together, and creates the table the first time:

```fckt
module SqliteStore {
  @Database @Fail prepare(): Unit = script(
    "CREATE TABLE IF NOT EXISTS links (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, url TEXT NOT NULL, visits INTEGER NOT NULL DEFAULT 0)"
  )

  @Database @Fail keeping<A>(body: @LinkRepository @UnitOfWork () -> A): A = SqliteLinks {
    SqliteTransactions { body() }
  }
}
```

Code that runs inside `SqliteStore.keeping { ... }` can use both effects. Everything it does to
links goes to the database.

### In memory

`InMemoryStore.keeping` has the same shape, but keeps the links in a variable:

```fckt
module InMemoryStore {
  keeping<A>(body: @LinkRepository @UnitOfWork () -> A): A = {
    var memory = StoredLinks([], 0)
    LinkMemory(stored = () -> memory, store = links -> { memory = links }) {
      InMemoryLinks {
        InMemoryTransactions { body() }
      }
    }
  }
}
```

`InMemoryLinks` follows `LinkRepository` too, and works on a plain list:

```fckt
@LinkMemory module InMemoryLinks : LinkRepository {
  linkNamed(slug: Slug): Option<Link> = stored().newestFirst.find { it.slug == slug }

  newestFirst(): List<Link> = stored().newestFirst

  // ...
}
```

Memory has no transactions to start, so its `atomically` just runs the block:

```fckt
@LinkRepository module InMemoryTransactions : UnitOfWork {
  atomically<A>(work: @LinkRepository () -> A): A = work()
}
```

The application code doesn't change between the two. `FollowLink.execute` behaves the same inside
`SqliteStore.keeping` as it does inside `InMemoryStore.keeping`. That's what the tests rely on.

## The HTTP layer

### Routes

`LinkRoutes` lists the service's routes in a table. Each route gives the method and path, what to
read from the request, the function that handles it, and the responses it can give:

```fckt
module LinkRoutes {
  routes: List<Route<@LinkRepository @UnitOfWork>> = endpoints + [OpenApi.documenting("/openapi.json", "fk-links", "0.1.0", endpoints)]

  private endpoints: List<Route<@LinkRepository @UnitOfWork>> = [
    get("/health", nothing, health)
      .answering(ok),
    post("/links", body(ShortenRequestSerializer), shortenLink)
      .answeringJson(created, LinkViewSerializer)
      .answeringJson(conflict, ProblemViewSerializer)
      .answeringJson(unprocessableContent, ProblemViewSerializer),
    get("/links/{slug}", slug, showLink)
      .answeringJson(ok, LinkViewSerializer)
      .answeringJson(notFound, ProblemViewSerializer),
    get("/{slug}", slug, followLink)
      .answering(found)
      .answeringJson(notFound, ProblemViewSerializer),
    // ...
  ]

  private slug: Input<String> = param("slug")

  private shortenLink(asked: ShortenRequest): Response =
    answering(ShortenLink.execute(Views.request(asked))) { link -> json(created, LinkViewSerializer, Views.link(link)) }

  private followLink(slug: String): Response =
    answering(FollowLink.execute(slug)) { target -> Response(found, [Header("Location", target.text)]) }

  private answering<A>(result: Result<A, LinkProblem>, success: (A) -> Response): Response = when (result) {
    Ok(value) -> success(value)
    Error(problem) -> Problems.response(problem)
  }
}
```

The type `Route<@LinkRepository @UnitOfWork>` says that these routes need both effects handled
before they can answer anything.

Each handler is a named function that takes what the route read from the request.
`body(ShortenRequestSerializer)` reads the JSON body into a `ShortenRequest`, and `param("slug")`
reads the `{slug}` part of the path. The `answeringJson` lines describe the possible responses.
`OpenApi.documenting` uses them to build `/openapi.json`, so the published description comes from
the same table that handles the requests.

### JSON

The JSON the service reads and writes is described by its own types, kept apart from the domain's:

```fckt
@Serializable type ShortenRequest(url: String, slug: Option<String> = None)
@Serializable type LinkView(slug: String, url: String, visits: Int)
@Serializable type ProblemView(error: String)
```

`@Serializable` makes fk-serialization generate a serializer for each one, such as
`LinkViewSerializer`. Keeping these separate means the API can stay the same if the domain types
change. `Views` converts between them:

```fckt
module Views {
  link(link: Link): LinkView = LinkView(link.slug.text, link.target.text, link.visits)
  // ...
}
```

### Problems as responses

`Problems` decides which status and message each `LinkProblem` becomes:

```fckt
module Problems {
  response(problem: LinkProblem): Response = when (problem) {
    InvalidUrl(url) -> saying(unprocessableContent, "'$url' isn't an http or https URL")
    InvalidSlug(slug) -> saying(unprocessableContent, "'$slug' can't be a link's name: it must be 3 to 32 letters, digits, - or _, and not one of ${Slugs.reserved.joinToString(", ")}")
    SlugTaken(slug) -> saying(conflict, "there's already a link called '${slug.text}'")
    NoSuchLink(slug) -> saying(notFound, "there's no link called '$slug'")
  }

  private saying(status: Status, error: String): Response = json(status, ProblemViewSerializer, ProblemView(error))
}
```

If you add a case to `LinkProblem` later, this `when` stops compiling until you decide how that
problem should be answered.

## Putting it together

`main.fk` reads the command line, opens the database and starts the server:

```fckt
import uk.m4xy.cli.*
import uk.m4xy.cli.Arguments.*
import uk.m4xy.http.server.Routes
import uk.m4xy.http.server.Server
import uk.m4xy.links.infrastructure.SqliteStore
import uk.m4xy.links.presentation.LinkRoutes
import uk.m4xy.sql.Databases
import fckt.io.Console

type Options(port: Int, database: String)

options: Command<Options> = Command("fk-links", "Serves short links, kept in a SQLite database.", Arguments {
  port by optionOr("port", "PORT", "the port to listen on", "8080", short = Some('p')).as(Arguments.int)
  database by optionOr("database", "FILE", "the SQLite database to keep links in", "links.db", short = Some('d'))
  Options(port, database)
})

main(args: List<String>) = Cli.run(options, args) { o ->
  Databases.opening(o.database) {
    SqliteStore.prepare()
    println("fk-links: serving links from ${o.database} on port ${o.port}")
    Server.serve(o.port, Routes.around(LinkRoutes.routes) { respond -> SqliteStore.keeping { respond() } })
  }
}
```

`options` describes the command-line options, and fk-cli builds `--help` from it:

```
$ build/bin/fk-links --help
usage: fk-links [options]

Serves short links, kept in a SQLite database.

options:
  -p, --port PORT      the port to listen on (otherwise 8080)
  -d, --database FILE  the SQLite database to keep links in (otherwise links.db)
  -h, --help           show this help
```

`Routes.around` wraps every request in `SqliteStore.keeping`, which handles the two effects the
routes need. Each request gets its own handler. If the database fails while answering one request,
that request gets a 500, and the server keeps running.

This file is the only place that opens a network port or a file.

## Testing

Because the storage is an effect, tests can swap in a different handler. The project has three test
files, one for each layer below main. See [Testing](/testing) for how fk-tests works.

The domain tests need no handler at all, because the domain doesn't use any effects:

```fckt
@Test @Fail madeNamesCountInBase62() = {
  assertEquals(["1", "Z", "10", "11"], [1, 61, 62, 63].map { Slugs.made(it, 0).text })
  assertEquals("2-1", Slugs.made(2, 1).text)
}
```

The application tests run the use cases inside `InMemoryStore.keeping`, with no database:

```fckt
@Test @Fail followingCountsVisits() = InMemoryStore.keeping {
  slug = slugOf(ShortenLink.execute(ShortenLink.Request("https://example.com/long")))
  assertEquals("1", slug)
  assertEquals(Some("https://example.com/long"), FollowLink.execute(slug).toOption().map { it.text })
  FollowLink.execute(slug)
  assertEquals(Some(2), ShowLink.execute(slug).toOption().map { it.visits })
}
```

The service tests send real HTTP requests to every route, but without opening a port or a file.
Inside `Server.answering`, requests sent with fk-http's client go straight to the routes instead of
over the network, and SQLite's `":memory:"` database stands in for the file:

```fckt
@SqlEngine @Network @Fail service<A>(body: @Http @Database () -> A): A = Databases.opening(":memory:") {
  SqliteStore.prepare()
  Server.answering(Routes.around(LinkRoutes.routes) { respond -> SqliteStore.keeping { respond() } }) { body() }
}

@Test @SqlEngine @Network @Fail aLinkCanAskForItsName() = service {
  assertEquals(LinkView("docs", "https://fckt.dev/docs", 0), shorten("https://fckt.dev/docs", Some("docs")).json(LinkViewSerializer))
  taken = shorten("https://elsewhere.dev", Some("docs"))
  assertEquals(conflict, taken.status)
  assertEquals("there's already a link called 'docs'", problemIn(taken))
}
```

`service` is set up exactly like `main`, so these tests cover the same code that runs in
production. `shorten` and `problemIn` are small helpers in the same file that post a
`ShortenRequest` and read a `ProblemView`.

Run all three files with:

```
$ kiln test
  20 passed, 0 failed
```
