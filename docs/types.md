# Types

This page covers the types you define yourself: records, types with cases, aliases and generic
types, and how to hide a type's insides from the rest of your program.

## Records

A record groups named values. Declare one by listing its fields in parentheses:

```fckt
type Point(x: Int, y: Int)

p = Point(1, 2)
p.x                             // 1
```

You build a record by calling its name like a function, and read a field with a dot.

### Default values

A field can have a default. When you build the record, you can leave that field out, or pass it by
name:

```fckt
type Project(name: String, version: String = "0.1.0")

Project(name = "shop")          // Project(name=shop, version=0.1.0)
Project("shop", version = "2.0")  // Project(name=shop, version=2.0)
```

### Copying with changes

Fields don't change once a record is built. To get a record with one field different, use `copy`.
The original stays as it was:

```fckt
p.copy(y = 5)                   // Point(x=1, y=5)
```

If you need a field that does change, mark it `var`. [Mutation](/mutation) explains how.

### Equality and printing

Two records are equal when their fields are equal:

```fckt
Point(1, 2) == Point(1, 2)      // true
```

In a string template, a record prints as its name and fields:

```fckt
"$p"                            // Point(x=1, y=2)
```

### Records with one field

If a record has one field and you don't name it, the field is called `value`. This is handy for
giving a plain value its own type, so a price can't be mixed up with a count:

```fckt
type Money(Int)

Money(3).value                  // 3
```

## Types with cases

Some values are one of a fixed set of alternatives. A shape is a circle or a rectangle, and nothing
else. Declare the alternatives, called cases, in braces. Each case can have its own fields:

```fckt
type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
}

Circle(1.0)                     // Circle(radius=1.0)
```

To find out which case you have, use [`when`](/control-flow#when), with a branch for each one.

### Enumerations

When none of the cases carry any data, the type is an enumeration. `values` lists every case in the
order you declared them, and `name` gives a case's name:

```fckt
type Level { Debug, Info, Warning }

Level.values                    // [Debug, Info, Warning]
Warning.name                    // Warning
```

### Sharing cases between types

A type can be made from some of another type's cases. Here every `Vowel` is also a letter of the
`Alphabet`:

```fckt
type Alphabet { A, B, C, E }
type Vowel { Alphabet.A, Alphabet.E }
```

You can pass a `Vowel` anywhere an `Alphabet` is expected. Going the other way, `is Vowel` checks
whether a letter is one of them:

```fckt
letter(a: Alphabet) = when (a) {
  is Vowel -> "vowel"
  else -> "consonant"
}

letter(E)                       // vowel
letter(B)                       // consonant
```

To take in all of another type's cases at once, write `*` before its name: `*Vowel`.

## Type aliases

An alias gives an existing type a second name. It's useful when a type is long, or when a name
says more than the type does:

```fckt
type Names = List<String>
type Pair<A> = (A, A)

names: Names = ["Ada", "Alan"]
```

An alias doesn't create a new type. A `Names` is a `List<String>`, and you can use one wherever the
other is expected.

## Generic types

A type can take type parameters, written in angle brackets. A `Box<T>` holds a value of any type:

```fckt
type Box<T>(value: T)

Box("hi").value                 // hi
```

Functions take type parameters the same way. See [Functions](/functions#generic-functions).

## Hiding how a type works

Sometimes a type has rules its values must follow, like a temperature that can't go below absolute
zero. If any code could build one, any code could break those rules. There are two ways to let only one
module build a type.

### Private constructors

A [module](/modules) groups declarations under one name. If you write `private` before a record's fields, only the module that declares it can build one.
Code outside can still read its fields:

```fckt
module Temperatures {
  type Celsius private(degrees: Float)
  of(degrees: Float): Option<Celsius> = if (degrees >= -273.15) Some(Celsius(degrees)) else None
}

Temperatures.of(20.0)           // Some(Celsius(degrees=20.0))
```

`of` gives back an [`Option`](/collections#option): `Some` with a value, or `None` when the
temperature is impossible.

If you build one outside the module, you get this error:

```
error: Celsius's constructor is private to Temperatures
```

### Opaque types

An opaque type goes further. Code outside its module can't see what it's made of. It can hold a
value, store it and pass it back to the module's functions, but it can't look inside.

```fckt
module Ratios {
  opaque type Ratio = Int
  of(n: Int): Option<Ratio> = if (n >= 0) Some(n) else None
  value(r: Ratio): Int = r
}
```

Inside `Ratios`, a `Ratio` is an `Int`. Outside it, it's only a `Ratio`, so using it as a
number gives an error:

```
error: type mismatch: expected Int but found Ratios.Ratio
```
