# Text

Strings and characters are built into the language, and [Collections and text](/collections#strings)
covers them. The `fckt.text` package is for raw bytes, for short digests of text, and for writing
values as text and reading them back.

| Import | What it's for |
| --- | --- |
| `fckt.text.Bytes`, `fckt.text.Encodings.*` | Raw data, and converting between text and bytes |
| `fckt.text.Digests.*` | `md5()` on strings and bytes |
| `fckt.text.Format` | A spec for writing a type as text and reading it back |

## Bytes

`Bytes` is raw data, such as the contents of an image file. Each byte is a number from 0 to 255.
Strings in fckt are UTF-8, so `encodeToBytes` gives you the bytes a string is made of, and
`decodeToString` turns bytes back into a string:

```fckt
import fckt.text.Bytes
import fckt.text.Encodings.*

bytes = "hé".encodeToBytes()

bytes.size                          // 3
bytes[0].toInt()                    // 104
bytes.toList().map { it.toInt() }   // [104, 195, 169]
bytes.decodeToString()              // hé
```

`é` takes two bytes, so there are three in all.

Not every list of bytes is valid UTF-8. `decodeToString` replaces anything that isn't with `�`.
If you'd rather know, use `decodeUtf8`, which gives a `Result`:

```fckt
import fckt.text.Bytes
import fckt.text.Encodings.*

broken = bytesOf([104.toByte(), 255.toByte()])

broken.decodeToString()         // h�
broken.decodeUtf8()             // Error(not UTF-8)
"ok".encodeToBytes().decodeUtf8()   // Ok(ok)
```

| Function | What it gives |
| --- | --- |
| `text.encodeToBytes()` | The text's UTF-8 bytes |
| `bytes.decodeToString()` | The text, with invalid bytes replaced |
| `bytes.decodeUtf8()` | The text, or an `Error` if the bytes aren't UTF-8 |
| `bytesOf(list)`, `bytes.toList()` | Bytes from a list of `Byte`, and back |
| `bytes.size`, `bytes[i]` | The number of bytes, and one of them |
| `a + b` | Two lots of bytes joined together |

Files can be read and written as bytes too, with `readBytes` and `writeBytes` from
[`fckt.io.Files`](/standard-library/io#files).

## Digests

`md5()` gives a short fingerprint of a string or of bytes: 32 hex digits that are always the same
for the same input.

```fckt
import fckt.text.Digests.*

"hello".md5()                   // 5d41402abc4b2a76b9719d911017c592
"hello!".md5()                  // 5a8dd3ad0756a93ded72b823b19dd877
```

It's useful for spotting that something has changed, or as a name to keep a cached result under.
MD5 isn't safe for passwords or anything secret, so don't use it for those.

## Formats

A format is a module that can write a value of some type as text, and read that text back. It
follows the `Format` spec, which has a type `T` and two functions:

- `of(value)` writes a `T` as a `String`.
- `read(text)` gives back `Ok` with the `T`, or `Error` with the reason it couldn't.

```fckt
import fckt.text.Format

module IntText : Format {
  type T = Int
  of(value: Int): String = "$value"
  read(text: String): Result<Int, String> = when (text.toIntOrNone()) {
    Some(n) -> Ok(n)
    None -> Error("not a number: $text")
  }
}

IntText.of(42)                  // 42
IntText.read("42")              // Ok(42)
IntText.read("x")               // Error(not a number: x)
```

A format should read back exactly what it writes, so `read(of(value))` is always `Ok(value)`. Since
every format has the same shape, code that works for any format, such as a test that checks that
round trip, only has to be written once. [Testing](/testing#check-that-a-format-reads-back-what-it-writes)
shows one.

Here's a format for a record, which writes it as two numbers separated by a comma:

```fckt
import fckt.text.Format

type Point(x: Int, y: Int)

module PointText : Format {
  type T = Point
  of(value: Point): String = "${value.x},${value.y}"
  read(text: String): Result<Point, String> = when (text.split(",").map { it.toIntOrNone() }) {
    [Some(x), Some(y)] -> Ok(Point(x, y))
    else -> Error("expected x,y but found $text")
  }
}

PointText.of(Point(3, 4))       // 3,4
PointText.read("3,4")           // Ok(Point(x=3, y=4))
PointText.read("3")             // Error(expected x,y but found 3)
```
