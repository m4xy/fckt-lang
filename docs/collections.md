# Collections and text

This page covers the types you'll use to hold and shape data: lists, ranges, options, results,
maps, sets, arrays, strings, characters and bytes.

## Lists

A list holds values of one type, in order. Write it in square brackets:

```fckt
xs = [3, 1, 4, 1, 5, 9, 2, 6]
xs.size                         // 8
xs.contains(4)                  // true
```

Lists never change. Every function on this page that seems to modify a list gives you a new one
instead.

### Transform a list

```fckt
xs.map { it * 10 }              // [30, 10, 40, 10, 50, 90, 20, 60]
xs.filter { it > 3 }            // [4, 5, 9, 6]
xs.sum()                        // 31
xs.fold(0) { acc, x -> acc + x }    // 31
```

`fold` walks through the list, carrying a value along. Here it starts at `0` and adds each item.

`mapNotNull` maps each item to an `Option` and keeps only the values that are there:

```fckt
["1", "x", "3"].mapNotNull { it.toIntOrNone() }   // [1, 3]
```

### Sort and reorder

```fckt
xs.sorted()                     // [1, 1, 2, 3, 4, 5, 6, 9]
xs.sortedDescending()           // [9, 6, 5, 4, 3, 2, 1, 1]
xs.distinct()                   // [3, 1, 4, 5, 9, 2, 6]
xs.reversed()                   // [6, 2, 9, 5, 1, 4, 1, 3]
```

To sort by something other than the items themselves, use `sortedBy`:

```fckt
type Person(name: String, age: Int)

people = [Person("Ada", 36), Person("Alan", 41), Person("Grace", 85)]
people.sortedBy { it.age }.map { it.name }    // [Ada, Alan, Grace]
```

### Take pieces of a list

```fckt
xs.take(3)                      // [3, 1, 4]
xs.drop(5)                      // [9, 2, 6]
xs.firstOrNone()                // Some(3)
xs.lastOrNone()                 // Some(6)
xs.getOrNone(2)                 // Some(4)
xs.getOrNone(20)                // None
```

Functions that might not find anything, such as `firstOrNone` on an empty list, return an
[`Option`](#option).

### Ask questions about a list

```fckt
xs.any { it > 8 }               // true
xs.all { it > 0 }               // true
xs.count { it == 1 }            // 2
xs.find { it > 4 }              // Some(5)
xs.minOrNone()                  // Some(1)
xs.maxOrNone()                  // Some(9)
people.maxByOrNone { it.age }   // Some(Person(name=Grace, age=85))
```

### Split and combine lists

```fckt
xs.partition { it % 2 == 0 }    // ([4, 2, 6], [3, 1, 1, 5, 9])
xs.chunked(3)                   // [[3, 1, 4], [1, 5, 9], [2, 6]]
[1, 2, 3].zip(["a", "b", "c"])  // [(1, a), (2, b), (3, c)]
[[1, 2], [3]].flatten()         // [1, 2, 3]
```

`joinToString` turns a list of strings into one string:

```fckt
people.map { it.name }.joinToString(", ")   // Ada, Alan, Grace
```

## Ranges

A range is a list of consecutive numbers or characters:

```fckt
1..5                            // [1, 2, 3, 4, 5]
0..<3                           // [0, 1, 2]
5.downTo(1)                     // [5, 4, 3, 2, 1]
'a'..'e'                        // [a, b, c, d, e]
```

`1..5` includes both ends. `0..<3` stops just before `3`, which makes it handy for the indexes of a
list: `0..<xs.size`.

## Option

An `Option` holds a value that might be missing. It's either `Some(value)` or `None`.

```fckt
present: Option<Int> = Some(4)
missing: Option<Int> = None

present.map { it * 2 }          // Some(8)
missing.map { it * 2 }          // None
present.getOrElse(0)            // 4
missing.getOrElse(0)            // 0
missing.orElse { Some(7) }      // Some(7)
present.filter { it > 5 }       // None
present.toList()                // [4]
```

`map` changes the value if there is one. `getOrElse` takes the value out, using a fallback if it's
missing. `orElse` gives you another `Option` to try instead.

## Result

A `Result` is either `Ok(value)` or `Error(reason)`. Use it for operations that can go wrong:

```fckt
parse(s: String): Result<Int, String> = when (s.toIntOrNone()) {
  Some(n) -> Ok(n)
  None -> Error("not a number: $s")
}

parse("12").map { it + 1 }      // Ok(13)
parse("x").getOrElse(0)         // 0
parse("x").mapError { it.length }   // Error(15)
```

When you have a list of things to check, `mapResult` gives you all the values if every step
succeeds, or the first error:

```fckt
["1", "2", "3"].mapResult { parse(it) }   // Ok([1, 2, 3])
["1", "x", "3"].mapResult { parse(it) }   // Error(not a number: x)
```

`foldResult` works like `fold`, but stops at the first `Error`:

```fckt
[1, 2, 3].foldResult(0) { acc, x -> if (x < 3) Ok(acc + x) else Error("too big: $x") }
// Error(too big: 3)
```

## Maps

A map links keys to values. Maps live in the standard library, so import them first:

```fckt
import fckt.collections.Maps.*

ages = mapOf([("Ada", 36), ("Alan", 41)])
ages["Ada"]                     // Some(36)
ages["Bob"]                     // None
ages.getOrElse("Bob") { 0 }     // 0
ages.containsKey("Alan")        // true
```

Looking up a key gives an `Option`, because the key might not be there.

Like lists, maps never change. `put` and `remove` give you a new map:

```fckt
older = ages.put("Grace", 85).remove("Alan")
older                           // {Ada=36, Grace=85}
older.keys                      // [Ada, Grace]
older.values                    // [36, 85]
```

Keys come out sorted, whatever order you added them in.

Functions that look at both keys and values take a block with two parameters:

```fckt
ages.mapValues { _, age -> age + 1 }    // {Ada=37, Alan=42}
ages.filter { _, age -> age > 40 }      // {Alan=41}
```

You can also build a map from a list:

```fckt
people.groupBy { it.age > 40 }
// {false=[Person(name=Ada, age=36)], true=[Person(name=Alan, age=41), Person(name=Grace, age=85)]}
people.associateBy { it.name }.keys     // [Ada, Alan, Grace]
```

## Sets

A set holds each value at most once:

```fckt
import fckt.collections.Sets.*

s = setOf([3, 1, 3, 2])
s                               // [1, 2, 3]
s.contains(2)                   // true
s.plus(5)                       // [1, 2, 3, 5]
s.minus(3)                      // [1, 2]
s.union(setOf([9]))             // [1, 2, 3, 9]
s.intersect(setOf([1, 9]))      // [1]
xs.toSet()                      // [1, 2, 3, 4, 5, 6, 9]
```

## Arrays

An array has a fixed size, and you can change its items in place. Reach for one when you need fast
access by position, or when you're changing items often:

```fckt
import fckt.collections.Array
import fckt.collections.Arrays.*

arr = arrayOf(3, 0)             // three items, all 0
arr[1] = 7
arr[2] += 1
arr.toList()                    // [0, 7, 1]
```

Changing an array is the `@Mutating` effect. If an array is created inside a function and never
leaves it, the function doesn't need to declare it.

## Mutable

`Mutable` holds one value that can change. It's useful when a block needs to update something
outside itself:

```fckt
import fckt.values.Mutable

counter = Mutable(0)
[1, 2, 3].forEach { counter.value += it }
counter.value                   // 6
```

## Strings

Strings hold text. Functions that count, such as `length` and `substring`, count characters, not
bytes, so letters like `ï` and `é` count as one:

```fckt
word = "naïve café"
word.length                     // 10
word.substring(0, 5)            // naïve
word.indexOf("café")            // 6
```

Some common functions:

```fckt
"a,b,,c".split(",")             // [a, b, , c]
"  trim me  ".trim()            // trim me
"x".padStart(3, '0')            // 00x
"hello".replace("l", "L")       // heLLo
"one\ntwo".lines()              // [one, two]
"report.txt".removeSuffix(".txt")   // report
"a.b.c".substringAfterLast(".") // c
"hello".uppercase()             // HELLO
```

`uppercase` and `lowercase` only change the letters a to z.

### Raw strings

A string in triple quotes is a raw string. Backslashes in it are kept as they are, which is useful
for file paths and regular expressions. Templates still work:

```fckt
name = "ada"
"""C:\Users\$name"""            // C:\Users\ada
```

## Characters

A `Char` is a single character, written in single quotes. It can be any Unicode character, including
emoji:

```fckt
'é'.code                        // 233
'😀'.code                       // 128512
65.toChar()                     // A
'7'.isDigit()                   // true
'x'.isLetter()                  // true
```

## Bytes

A `Byte` is a number from 0 to 255. `toByte` keeps the lowest eight bits of an `Int`, so numbers
outside that range wrap around:

```fckt
300.toByte().toInt()            // 44
(-1).toByte().toInt()           // 255
```

Raw data, such as the contents of a binary file, is `Bytes`. Turn text into bytes with
`encodeToBytes`, and back with `decodeToString` or `decodeUtf8`:

```fckt
import fckt.text.Bytes
import fckt.text.Encodings.*

bytes = "hé".encodeToBytes()
bytes.size                      // 3
bytes.toList().map { it.toInt() }   // [104, 195, 169]
bytes.decodeToString()          // hé
bytes.decodeUtf8()              // Ok(hé)
```

`é` takes two bytes, so the size is 3. `decodeToString` replaces anything that isn't valid text
with `�`, while `decodeUtf8` gives an `Error` instead.

## Lazy values

`lazy` wraps a calculation so it only runs when you first ask for the value:

```fckt
big = lazy(~(1..1000).sum())
big.isInitialized()             // false
big.value                       // 500500
big.isInitialized()             // true
```

After the first time, `value` gives back the stored result without running the calculation again.
