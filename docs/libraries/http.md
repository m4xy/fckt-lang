# HTTP

[fk-http](https://github.com/m4xy/fk-http) is an HTTP/1.1 client and server. Both use the same
`Request` and `Response` types, so you can test a client and a server together in one program
without opening a socket.

## Add it to a project

List it as a dependency in `build.fk`:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.*

project = Project(name = "shop", dependencies = [library("uk.m4xy:fk-http:0.1.0")])

plugins = [Fckt()]
```

fk-http uses OpenSSL for https, through the OCaml package `ssl`. kiln links that package into your
program for you, but it has to be installed once on the machine that builds it. On a Mac:

```sh
brew install opam pkgconf
opam init --bare --no-setup
opam switch create default ocaml-system
PKG_CONFIG_PATH=$(brew --prefix openssl@3)/lib/pkgconfig opam install ssl ocamlfind
```

To send and receive JSON, add [fk-serialization](/libraries/serialization) as well.

## A first server

A server is a list of routes. Each route has a method, a path, what it reads from the request, and
a function that gives back the response. Writing the routes as a table and the handlers as named
functions underneath keeps the table easy to scan:

```fckt
// src/shop/Greetings.fk
import uk.m4xy.http.*
import uk.m4xy.http.Messages.*
import uk.m4xy.http.Statuses.*
import uk.m4xy.http.server.*
import uk.m4xy.http.server.Endpoints.*
import uk.m4xy.http.server.Inputs.*

module Greetings {
  routes: List<Route> = [
    get("/health", nothing, health),
    get("/hello/{name}", param("name"), hello),
  ]

  health(_: Unit): Response = text(ok, "ok")

  hello(name: String): Response = text(ok, "Hello, $name")
}
```

```fckt
// src/main.fk
import uk.m4xy.http.server.Server
import shop.Greetings

main() = Server.serve(8080, Greetings.routes)
```

```sh
kiln build && ./build/bin/shop
```

```sh
curl localhost:8080/hello/Ada     # Hello, Ada
```

`text(status, text)` makes a plain-text response. `Statuses` names the common statuses, such as
`ok`, `created`, `notFound` and `badRequest`.

## Paths

A path segment in braces, like `{name}`, matches any single segment, and `param("name")` reads what
it matched.

The order you write routes in doesn't matter. A fixed segment is tried before a parameter, so
`/links` goes to the route for `/links`, not the one for `/{slug}`. If two routes with the same
method would match the same requests, such as `GET /items/{id}` and `GET /items/{slug}`, the server
refuses to start and says which two they are.

When no route matches, the server answers for you:

| Request | Response |
| --- | --- |
| No route has that path | 404 Not Found |
| Routes have that path, but not that method | 405 Method Not Allowed, with an `Allow` header listing the methods that do |
| The route's function fails | 500 Internal Server Error, with the reason |

## Reading a request

What a route reads from a request is called its input. These are the inputs you can start from:

| Input | Reads | Type |
| --- | --- | --- |
| `param("id")` | a path parameter, `{id}` | `Input<String>` |
| `query("page")` | a query parameter, `?page=2` | `Input<Option<String>>` |
| `header("Accept")` | a request header | `Input<Option<String>>` |
| `bodyText` | the body as text | `Input<String>` |
| `body(serializer)` | the body as JSON | `Input<A>` |
| `nothing` | nothing | `Input<Unit>` |

Use `.as` to turn text into another type. You give it a few words describing what the text should
be, which are used in the error message when it isn't:

```fckt
private itemId: Input<Int> = param("id").as("a number") { it.toIntOrNone() }
```

A request to `/items/one` is answered `400 Bad Request` with `'one' isn't a number`, and your
handler isn't called.

To read several things at once, put them in an `Inputs` block. Each line names a value with `by`,
and the last line builds the result:

```fckt
module Shelves {
  type Place(shelf: String, position: Int, sort: Option<String>)

  routes: List<Route> = [
    get("/shelves/{shelf}/{position}", place, showPlace),
  ]

  private place: Input<Place> = Inputs {
    shelf by param("shelf")
    position by param("position").as("a number") { it.toIntOrNone() }
    sort by query("sort")
    Place(shelf, position, sort)
  }

  private showPlace(place: Place): Response =
    text(ok, "shelf ${place.shelf}, position ${place.position}, sorted by ${place.sort.getOrElse("name")}")
}
```

`GET /shelves/b/3?sort=price` gives `shelf b, position 3, sorted by price`. If several inputs are
wrong, the 400 response lists all of them, not only the first, as in
`'x' isn't a number; 'y' isn't a number`.

If an input reads a path parameter that the path doesn't have, as `get("/items/{id}", param("slug"),
...)` does, the program stops with an error as soon as it starts, before it serves anything.

## JSON

With [fk-serialization](/libraries/serialization), a type marked `@Serializable` gets a serializer,
and `JsonBodies` uses it to read and write request and response bodies:

```fckt
// src/shop/Item.fk
import uk.m4xy.serialization.*

@Serializable type Item(id: Int, name: String, price: Int)
```

```fckt
// src/shop/NewItem.fk
import uk.m4xy.serialization.*

@Serializable type NewItem(name: String, price: Int)
```

`body(NewItemSerializer)` is an input that reads the request's body as a `NewItem`, and
`json(status, serializer, value)` makes a JSON response:

```fckt
import uk.m4xy.http.json.JsonBodies.*

routes: List<Route> = [
  post("/items", body(NewItemSerializer), addItem),
]

private addItem(item: NewItem): Response = json(created, ItemSerializer, Item(3, item.name, item.price))
```

A request whose body isn't a valid `NewItem` is answered 400, with the reason.

## Routes that use effects

A route's function can use effects. The effects become part of the route's type: a route whose
function does `@Stock` is a `Route<@Stock>`. Here `Stock` is an effect that gives back the items
for sale:

```fckt
// src/shop/Stock.fk
effect Stock {
  items(): List<Item>
}
```

```fckt
module Catalog {
  routes: List<Route<@Stock>> = [
    get("/items/{id}", itemId, showItem),
    post("/items", body(NewItemSerializer), addItem),
  ]

  private itemId: Input<Int> = param("id").as("a number") { it.toIntOrNone() }

  @Stock private showItem(id: Int): Response = when (Stock.items().find { it.id == id }) {
    Some(item) -> json(ok, ItemSerializer, item)
    None -> text(notFound, "there's no item $id")
  }

  private addItem(item: NewItem): Response = json(created, ItemSerializer, Item(3, item.name, item.price))
}
```

`Routes.around` wraps every route in a handler, so you can provide the effect once for the whole
service. The handler runs separately for each request, so if one request fails, the others aren't
affected:

```fckt
module Shop {
  starting = [Item(1, "desk", 120), Item(2, "lamp", 35)]

  routes: List<Route> = Routes.around(api) { respond -> Stock(items = ~starting) { respond() } }

  private api: List<Route<@Stock>> = [
    *Greetings.routes,
    *Routes.mounted("/api", Catalog.routes),
  ]
}
```

`Routes.mounted("/api", routes)` puts a group of routes under a prefix, so `/items/{id}` is served
at `/api/items/{id}`. Each part of a service can keep its own routes, and the service mounts them
together.

## Describing a service with OpenAPI

Because an endpoint says what it reads, fk-http can write an
[OpenAPI](https://www.openapis.org) document for your routes. Add what each route answers with,
and a short summary if you like:

```fckt
routes: List<Route<@Stock>> = [
  get("/items/{id}", itemId, showItem)
    .summarised("Shows one item")
    .answeringJson(ok, ItemSerializer)
    .answering(notFound),
  post("/items", body(NewItemSerializer), addItem)
    .summarised("Adds an item")
    .answeringJson(created, ItemSerializer),
]
```

Then serve the document as a route of its own:

```fckt
import uk.m4xy.http.openapi.OpenApi

private api: List<Route<@Stock>> = [
  *catalog,
  OpenApi.documenting("/openapi.json", "shop", "1.0.0", catalog),
]

private catalog: List<Route<@Stock>> = Routes.mounted("/api", Catalog.routes)
```

Each `@Serializable` type becomes a schema in the document. `OpenApi.document(title, version,
routes)` gives you the document as a `JsonValue` if you'd rather write it to a file.

## The client

`Client.get`, `Client.post` and `Client.send` send a request and give back the response:

```fckt
import fckt.io.Console
import uk.m4xy.http.Messages.*
import uk.m4xy.http.Statuses.*
import uk.m4xy.http.client.Client

main() = {
  response = Client.get("https://example.com")
  if (response.status.isSuccess()) println(response.text.take(15))
  else println("example.com answered ${response.status.code} ${response.status.reason}")
}
```

A 404 or a 500 is still a response, so check its status. A client call fails only when there's
no response at all: the host can't be reached, or, for https, its certificate isn't trusted. The
reason says which, for example `expired.badssl.com's certificate isn't trusted: certificate has
expired`.

To send and receive JSON:

```fckt
import uk.m4xy.http.json.JsonBodies.*

desk = Client.get("http://shop.example/api/items/1").json(ItemSerializer)
made = postJson("http://shop.example/api/items", NewItemSerializer, NewItem("chair", 60))
```

`.json(serializer)` reads a response's body, and fails with the reason if the body isn't valid.

Sending a request is an effect, `@Http`. `main` handles it by sending requests over the network.

## Testing

`Server.answering(routes) { ... }` sends the requests made in its block straight to your routes,
without a network. You can test a server through its client this way:

```fckt
import fckt.effects.Fail
import uk.m4xy.fktests.api.Test
import uk.m4xy.http.Messages.*
import uk.m4xy.http.Statuses.*
import uk.m4xy.http.net.Network
import uk.m4xy.http.client.Client
import uk.m4xy.http.json.JsonBodies.*
import uk.m4xy.http.server.Server
import shop.*

@Test @Fail @Network itemsAreFound() = Server.answering(Shop.routes) {
  desk = Client.get("http://shop.example/api/items/1").json(ItemSerializer)
  assertEquals(Item(1, "desk", 120), desk)
  assertEquals(badRequest, Client.get("http://shop.example/api/items/one").status)
}
```

To test routes that use an effect, handle it around the block with whatever the test needs:

```fckt
@Test @Fail @Network deskIsFound() = Stock(items = ~[Item(1, "desk", 120)]) {
  Server.answering(Catalog.routes) {
    assertEquals(Item(1, "desk", 120), Client.get("http://shop.example/items/1").json(ItemSerializer))
  }
}
```

To test code that calls some other service, handle `Http` yourself and answer every request:

```fckt
import uk.m4xy.http.client.Http

@Test @Fail @Network stubbed() = Http(send = request -> Ok(text(ok, "stubbed"))) {
  assertEquals("stubbed", Client.get("http://shop.example/items").text)
}
```

These tests are marked `@Network` because anything that does `@Http` does `@Network` too, even
though nothing here uses the network. See [Testing](/testing) for how to run them.

## Reference

### Requests and responses

| | |
| --- | --- |
| `Request(method, url, headers, body)` | A request. `headers` and `body` can be left out. |
| `Response(status, headers, body)` | A response. |
| `Method` | `Get`, `Head`, `Post`, `Put`, `Patch`, `Delete`, `Options` |
| `Status(code)` | A status. `.reason` gives its text, such as `Not Found`, and `.isSuccess()` is true for 2xx. |
| `Url(scheme, host, port, path, query)` | `UrlText.read` reads one from text, and `UrlText.of` writes it back. |
| `Header(name, value)` | `.header(name)` finds one on a request or response, ignoring case. |
| `text(status, text)` | A plain-text response. |
| `.text` | A request's or response's body, as text. |

### Server

| | |
| --- | --- |
| `get`, `post`, `put`, `patch`, `delete` | `(path, input, handler)` make a route. |
| `Server.serve(port, routes)` | Serves the routes until the program ends. |
| `Server.answering(routes) { ... }` | Answers the block's requests with the routes, without a network. |
| `Routes.respond(routes, request)` | The response the routes give to one request. |
| `Routes.mounted(prefix, routes)` | The routes under a prefix. |
| `Routes.around(routes) { respond -> ... }` | Each route wrapped in a handler. |
| `.answering(status)`, `.answeringJson(status, serializer)`, `.summarised(text)` | Describe a route for OpenAPI. |
| `OpenApi.documenting(path, title, version, routes)` | A route that serves the routes' OpenAPI document. |

### Client

| | |
| --- | --- |
| `Client.get(url)` | Sends a GET request. |
| `Client.post(url, body, contentType)` | Sends a POST request with a body of `Bytes`. |
| `Client.send(request)` | Sends any request. |
| `postJson(url, serializer, value)`, `putJson(...)` | Send a value as JSON. |
| `response.json(serializer)` | Reads a response's body as JSON. |

## What's not supported yet

- **Serving https.** The server only speaks plain HTTP. The client can use https.
- **Keep-alive.** Each connection carries one request.
- **Running on several cores.** The server answers many connections at once, but they take turns
  on one core. That's fine for work that mostly waits on the network, but a request that does a
  lot of computing holds up the others while it runs.
