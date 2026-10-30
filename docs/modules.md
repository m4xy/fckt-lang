# Modules and packages

As a program grows, you'll want to group related code together and decide what other parts of the
program can see. fckt has two tools for this: modules, which you declare in code, and packages,
which are the folders your code lives in.

## Modules

A module is a named group of declarations. Inside the module, its members can use each other by
name. Outside it, you put the module's name in front:

```fckt
import fckt.io.Console

module Ratios {
  type Ratio private(num: Int, denom: Int)

  make(n: Int, d: Int): Ratio = {
    g = gcd(n, d)
    Ratio(n / g, d / g)
  }

  add(a: Ratio, b: Ratio) = make(a.num * b.denom + b.num * a.denom, a.denom * b.denom)

  private gcd(a: Int, b: Int): Int = if (b == 0) abs(a) else gcd(b, a % b)
}

main() = {
  half = Ratios.make(2, 4)
  println("$half")                                   // Ratio(num=1, denom=2)
  println("${Ratios.add(half, Ratios.make(1, 3))}")  // Ratio(num=5, denom=6)
}
```

A module can hold functions, values, types and other modules. The two uses of `private` in `Ratios`
are explained under [Visibility](#visibility).

### Nested modules

Modules can contain other modules. To reach a nested one from outside, name each module on the way
in:

```fckt
module Shapes {
  type Shape {
    Circle(radius: Float)
    Square(side: Float)
  }

  area(s: Shape) = when (s) {
    is Circle -> 3.0 * s.radius * s.radius
    is Square -> s.side * s.side
  }

  module Scaling {
    double(s: Shape) = when (s) {
      is Circle -> Circle(s.radius * 2)
      is Square -> Square(s.side * 2)
    }
  }
}

Shapes.area(Shapes.Scaling.double(Shapes.Square(3.0)))   // 36.0
```

## Visibility

By default, everything in a module can be used from anywhere. Two modifiers narrow that down.

### private

A `private` declaration can only be used inside its module. In `Ratios` above, `gcd` is a helper
that nobody else needs:

```fckt
Ratios.gcd(4, 6)
```

```
error: 'gcd' is private to Ratios
```

### Private constructors

Sometimes you want everyone to be able to read a type, but only its module to create one. `Ratio`
is declared as `type Ratio private(...)`, so code outside `Ratios` can read `half.num`, but needs
`Ratios.make` to get a `Ratio`. That way, every ratio is in lowest terms. Building one directly gives
an error:

```fckt
Ratios.Ratio(1, 2)
```

```
error: Ratio's constructor is private to Ratios
```

`copy` counts as building a new value, so it's only available inside the module too.

### internal

An `internal` declaration can be used anywhere in your own project, but not by other projects that
use yours as a library. Use it for things your project shares between its packages that aren't part
of what it offers to others:

```fckt
internal module Rounding {
  internal toCents(amount: Float): Int = (amount * 100.0).toInt()
}
```

## Packages

Every folder in your project's `src` folder is a package, and its name is the folder's name. Nested
folders make nested packages, such as `shop.billing`.

```
src/
├── main.fk
├── geometry/
│   ├── Shapes.fk
│   └── units.fk
└── text/
    └── Labels.fk
```

A file's name decides what it can hold:

- **A file whose name starts with a capital letter** holds one declaration with the same name.
  `Shapes.fk` holds `module Shapes { /* ... */ }`. It can also be a type, a spec or an effect. Anything
  else in the file is private to it.
- **A file whose name starts with a lower-case letter** holds declarations that belong to the
  package itself, and can hold as many as you like. A `private` declaration in one of these files
  can only be used in that file.

So `geometry/units.fk` might hold a few plain functions:

```fckt
centimetres(metres: Float): Float = metres * 100.0

private round(x: Float): Int = x.toInt()

wholeCentimetres(metres: Float): Int = round(centimetres(metres))
```

Files in the same package can use each other's declarations without importing them.

## Imports

To use a declaration from another package, import it. There are a few forms:

```fckt
import geometry.Shapes                      // a module, with its types and their cases
import geometry.centimetres                 // one declaration from a package
import geometry.Shapes.area                 // one declaration from a module
import geometry.*                           // everything in a package
import geometry.Shapes.*                    // everything in a module
import geometry.Shapes.Shape.Circle as Round
```

Importing a module also brings in its types and their cases, so you can write `Square(2.0)` instead
of `Shapes.Square(2.0)`:

```fckt
import fckt.io.Console
import geometry.Shapes
import geometry.centimetres
import geometry.Shapes.Shape.Circle as Round

main() = {
  println("${Shapes.area(Round(1.0))}")     // 3.0
  println("${Shapes.area(Square(2.0))}")    // 4.0
  println("${centimetres(1.5)}")            // 150.0
}
```

`as` gives an imported declaration a different name in your file, for when two packages use the
same name, or a shorter name reads better.

You can also skip the import and write the full name: `geometry.Shapes.perimeter(Square(2.0))`.

### When two imports clash

If two imports bring in the same name, you only get an error if you use that name:

```fckt
import geometry.Shapes.*
import text.Labels.*

main() = println(area("a square"))
```

```
error: 'area' is imported from geometry.Shapes.area and text.Labels.area; import the one you mean by name
```

To fix it, import the one you want by name:

```fckt
import geometry.Shapes.*
import text.Labels.*
import text.Labels.area
```

## Building with packages

kiln finds the packages in your project's `src` folder for you. If you're running the compiler
yourself, packages next to your program's file are found automatically, and `-I` adds another
folder of packages:

```sh
fckt main.fk -I ../shared
```
