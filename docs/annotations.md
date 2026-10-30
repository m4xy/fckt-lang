# Annotations

An annotation attaches extra information to a declaration, such as the URL a function should
answer, or the database column a field is stored in. The compiler checks every annotation, then
leaves it out of the compiled program. Annotations are there for tools that read your code, like
code generators and test runners.

Effects such as `@Console` are written the same way, because every effect is an annotation too.

## Declaring an annotation

Declare an annotation with `annotation type`, and list its fields as you would for any type:

```fckt
annotation type Route(path: String, handler: (String) -> String)
```

An annotation can also have no fields at all: `annotation type Experimental`.

## Using an annotation

Write `@` and the annotation's name before a declaration, a field, a case or a parameter. Pass its
fields like the arguments to a function:

```fckt
greet(name: String) = "Hello, $name"

@Route("/hello", handler = greet)
main() = println(greet("Ada"))
```

The compiler checks the arguments against the annotation's fields. Here, `handler` has to be a
function from `String` to `String`:

```fckt
count(n: Int) = n + 1

@Route("/count", handler = count)
x = 1
```

```
error: type mismatch: expected (String) -> String but found (Int) -> Int
```

An argument has to be a constant, such as `1` or `"text"`, or a reference to something in your
program. It can't be a calculation:

```fckt
@Label("a" + "b")
x = 1
```

```
error: expected ')' but found '+'
```

## Referring to parts of your program

Besides ordinary values, an annotation's fields can refer to things in your program that only the
compiler knows about:

| Field type | What you pass |
| --- | --- |
| `Type` | A type, such as `List<User>` |
| `Spec` | A spec, such as `Ordered` |
| `Function` | A function, such as `setUp` |
| `Module` | Any module |
| `Module<Ordered>` | A module that follows the spec `Ordered` |
| `Case<Shape>` | One of `Shape`'s cases, such as `Shape.Circle` |
| `Field<User, String>` | A `String` field of `User`, such as `User.email` (use `_` for a field of any type) |

Fields can also hold another annotation, or a list or tuple of any of these:

```fckt
annotation type Codec(of: Type)
annotation type Derive(specs: List<Spec>)
annotation type SortedBy(order: Module<Ordered>)
annotation type Default(value: Case<Shape>)
annotation type Index(field: Field<User, String>)
annotation type Label(text: String)

@Index(User.email)
type User(name: String, @Label("e-mail") email: String)

@Default(Shape.Circle)
@Codec(List<User>)
@Derive([Ordered])
type Drawing(shapes: List<Shape>)
```

### Taking any number of arguments

Mark the last field `vararg` to let the annotation take any number of values. They arrive as a
list:

```fckt
annotation type Fixtures(vararg fixtures: Function)

setUp(test: () -> Unit) = test()
inTempFolder(test: () -> Unit) = test()

@Fixtures(setUp, inTempFolder)
main() = println("running")
```

You can pass no values at all, or pass the whole list by name: `@Fixtures(fixtures = [setUp])`.

## Annotations on annotations

An annotation can itself be annotated. Usually, that means it carries those annotations with it:
anything you mark with it gets them too. You can use this to group several effects under one name:

```fckt
import fckt.io.Console
import fckt.effects.Fail
import fckt.effects.Failure.*

@Console @Fail annotation type Io

@Io report(line: String) = if (line == "") fail("nothing to report") else println(line)
```

`report` now uses `@Console` and `@Fail`, and anything that calls it has to say so:

```fckt
@Console summary(line: String) = report(line)
```

```
error: 'summary' does @Fail, so it must say so: @Fail summary(...)
```

Some annotations describe the annotation itself instead, and aren't passed on. These are marked
`@Meta`. The standard library has three:

- **`@Repeatable`** lets the same annotation appear on a declaration more than once, with different
  values.
- **`@Propagates`** means that when you put the annotation on a module, everything inside the
  module has it too, including nested modules. A test framework can use this to apply fixtures to
  every test in a module.
- **`@Encapsulates`** is for annotations on specs. Whatever a module following the spec does
  beyond what the annotation says stays hidden from its callers.

```fckt
@Repeatable annotation type Tag(name: String)

@Propagates annotation type Owner(team: String)
```

## Reading annotations from a tool

Because annotations don't end up in the compiled program, tools read them from the compiler
instead. `fckt --symbols` checks your project and writes a description of every type it declares,
with their fields, cases and annotations:

```sh
fckt --symbols symbols.txt -I src shop
```

For a `shop` package that declares `annotation type Table(name: String)` and
`annotation type Column(name: String)`, and has this `Catalogue.fk`:

```fckt
module Catalogue {
  @Table("products")
  type Product(@Column("product_name") name: String, price: Int = 0)
}
```

it writes:

```
fckt-symbols 1
record shop.Catalogue.Product
  at 3 3 src/shop/Catalogue.fk
  annotation shop.Table
    argument name "products"
  field name String
    annotation shop.Column
      argument name "product_name"
  field price Int
    default
```

Each line describes one thing, indented under what it belongs to. The first line is the format's
version, so a tool can refuse a file written in a format it doesn't understand. Code generators
built on kiln, like the one fk-serialization uses, read this file to know what to generate.
