# HTML

[fk-html](https://github.com/m4xy/fk-html) builds HTML. You write a page as nested blocks, one for
each element, and fk-html turns it into text with everything that needs escaping escaped, so text
from a user can't break the page or slip a script into it.

## Add it to your project

```fckt
project = Project(
  name = "pages",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-html:0.1.0")],
)
```

Then import it:

```fckt
import uk.m4xy.html.Htmls.*
import uk.m4xy.html.Tags.*
```

## Build a page

Each element is a function named after its tag. It takes a list of attributes, which you can leave
out, and a block; whatever the block adds goes inside the element. `text` adds text:

```fckt
page {
  html {
    head { title { text("Shopping") } }
    body {
      h1 { text("Shopping") }
      ul {
        ["bread", "eggs", "milk"].forEach { item -> li { text(item) } }
      }
    }
  }
}
```

`page` gives the whole document as a `String`, starting with `<!doctype html>`. Because the
blocks are ordinary code, a loop, an `if` or a `when` inside one builds HTML the same way it would
build anything else.

## Attributes

`attribute("name", "value")` makes an attribute, and `flag("disabled")` makes one without a value.
`classes` and `id` cover the common ones:

```fckt
form {
  input([attribute("type", "checkbox"), flag("checked")])
  button([classes(["primary", "wide"])]) { text("Save") }
}
```

`a` takes the address it links to first, and `img` takes its source and a description of the
picture:

```fckt
p {
  a("/about") { text("About us") }
  img("cat.png", "A cat asleep on a keyboard")
}
```

Elements that can't contain anything, such as `br`, `hr`, `img` and `input`, take only
attributes, and fk-html writes them without an end tag. The `<main>` element is `mainElement`,
because `main` is the name of a program's entry point.

## Text and raw HTML

`text` escapes `&`, `<` and `>`, and attribute values have their quotes escaped too, so this is
safe whatever `comment` holds:

```fckt
p { text(comment) }
```

If you already have HTML you trust, for example from a Markdown library, `raw` adds it exactly as
it is.

## Pieces as values

`markup { ... }` gives what its block adds as an `Html` value instead of text, so you can build a
piece once and use it in several pages. An `Html` is an `Element`, `Text`, `Raw` or a `Fragment` of
several pieces, and you can make these directly too. `render` turns one into text:

```fckt
navigation = markup { nav { a("/") { text("Home") } } }
render(navigation)   // <nav><a href="/">Home</a></nav>
```

## How it works

Building is an effect, `Markup`, with one operation that adds a piece. Each element's function
handles `Markup` for its own block, collects what the block adds, and adds itself, with those
pieces inside, to whatever encloses it. `markup` and `page` handle the outermost block.
