# Serialization

[fk-serialization](https://github.com/m4xy/fk-serialization) turns your types into JSON and reads
them back. You mark a type `@Serializable`, and a serializer is written for it when you build.
You don't write any conversion code by hand.

```fckt
import uk.m4xy.serialization.*

@Serializable type Memo(title: String, tags: List<String> = [])
```

```fckt
import uk.m4xy.serialization.json.Json

Json.encode(MemoSerializer, Memo("Shopping", ["home"]))   // {"title":"Shopping","tags":["home"]}
Json.decode(MemoSerializer, "{\"title\":\"Shopping\"}")    // Ok(Memo(title=Shopping, tags=[]))
```

## Add it to a project

The serializers are written by a processor, a small program that kiln runs before it compiles
your code. Add the library as a dependency, and the processor to your fckt configuration:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.*

project = Project(name = "notes", dependencies = [library("uk.m4xy:fk-serialization:0.1.0")])

module Serialized : FcktConfiguration {
  layout(): FcktLayout = FcktLayout(processors = [
    Processor("uk.m4xy.serialization.processor.SerializerProcessor", [library("uk.m4xy:fk-serialization-processor:0.1.0")]),
  ])
}

plugins = [Fckt(Serialized)]
```

If you use [fk-tests](/testing), give its plugin the same configuration, so your tests can use
the serializers too: `plugins = [Fckt(Serialized), FkTests(StandardTests, Serialized)]`.

For each type marked `@Serializable`, the processor writes a module named after it with
`Serializer` on the end: `Memo` gets `MemoSerializer`. It's ordinary fckt code, written to
`build/generated`, so you can read it if you're curious. It's written again on every build, so
don't edit it.

## Records

A record is written as a JSON object, with one field for each of its fields:

```fckt
// src/notes/Note.fk
import uk.m4xy.serialization.*

@Serializable type Note(
  title: String,
  body: String = "",
  tags: List<String> = [],
  @SerialName("due_date") due: Option<String> = None,
  @Transient selected: Boolean = false,
)
```

```fckt
Json.encode(NoteSerializer, Note("Shopping", tags = ["home"], selected = true))
// {"title":"Shopping","body":"","tags":["home"],"due_date":null}
```

- `@SerialName("due_date")` writes a field under a different name.
- `@Transient` leaves a field out. It needs a default value, which is what it gets when the
  record is read back.
- A field with a default can be missing from the JSON. When it's missing, it gets its default.

```fckt
Json.decode(NoteSerializer, "{\"title\":\"Shopping\"}")
// Ok(Note(title=Shopping, body=, tags=[], due=None, selected=false))
```

## Types with cases

A type whose cases carry no data is written as the case's name. `@SerialName` changes the name
here too:

```fckt
@Serializable type Priority { Low, Normal, @SerialName("urgent") High }

Json.encode(PrioritySerializer, High)          // "urgent"
```

When the cases do carry data, each is written as an object with a `"type"` field naming the case,
followed by that case's fields:

```fckt
@Serializable type Reminder {
  At(time: String)
  Every(days: Int)
  Never
}

Json.encode(ReminderSerializer, Every(7))      // {"type":"Every","days":7}
Json.encode(ReminderSerializer, Never)         // {"type":"Never"}
```

## What a field can be

A field of a `@Serializable` type can be:

| Type | Written as |
| --- | --- |
| `Int`, `Float` | a number |
| `String`, `Char` | a string |
| `Boolean` | `true` or `false` |
| `List<A>` | an array |
| `Option<A>` | the value, or `null` for `None` |
| `Map<String, A>` | an object with one field per key |
| another `@Serializable` type | that type's JSON |

A `@Serializable` type can use another one, from your project or from a library:

```fckt
import uk.m4xy.serialization.*
import fckt.collections.Maps.*

@Serializable type Board(name: String, notes: List<Note>, priorities: Map<String, Priority>, reminder: Reminder)
```

If a field's type can't be written, the build stops and the processor tells you where:

```
src/notes/Task.fk:3:15: error: Task's total is a notes.Money, which isn't marked @Serializable
```

Some types can't be marked `@Serializable`: one with type parameters, one with a field that holds
a function, or one that only its own module is allowed to build. For those, you can write a
serializer by hand, as shown [below](#writing-a-serializer-by-hand).

## Reading JSON

`Json.decode` gives back a `Result`. If the text isn't what the serializer expects, you get an
`Error` that says what's wrong:

```fckt
Json.decode(NoteSerializer, "{\"body\":\"milk\"}")
// Error(notes.Note needs title, which isn't there)

Json.decode(NoteSerializer, "{\"title\": 3}")
// Error(expected a string, not 3)

Json.decode(ReminderSerializer, "{\"type\":\"Later\"}")
// Error(Later isn't a case of notes.Reminder)
```

Fields can come in any order. Fields the type doesn't have are ignored.

## JSON values

If you need to work with JSON that doesn't match one of your types, use `JsonValue`. It has a case
for each kind of JSON value:

| Case | JSON |
| --- | --- |
| `JsonNull` | `null` |
| `JsonBoolean(value)` | `true`, `false` |
| `JsonNumber(text)` | a number, kept as the text it was written as |
| `JsonString(value)` | a string |
| `JsonArray(items)` | an array |
| `JsonObject(fields)` | an object, as a list of `JsonField(name, value)` |

`JsonText` reads and writes them:

```fckt
import uk.m4xy.serialization.json.*

JsonText.read("{\"title\": \"Shopping\"}")
// Ok(JsonObject(fields=[JsonField(name=title, value=JsonString(value=Shopping))]))

JsonText.of(JsonArray([JsonNumber("1"), JsonBoolean(true), JsonNull]))   // [1,true,null]

JsonText.read("{\"title\": }")
// Error(at 11: expected a value, not '}')
```

`Json.toJson(serializer, value)` and `Json.fromJson(serializer, json)` convert between your types
and `JsonValue`, without going through text.

## Writing a serializer by hand

A serializer is a module that follows the `Serializer` spec. It says what type it's for, how to
write a value, and how to read one back. Here's one that writes an amount of money as a plain
number, rather than as an object:

```fckt
// src/notes/Money.fk
type Money(pence: Int)
```

```fckt
// src/notes/MoneySerializer.fk
import uk.m4xy.serialization.*

module MoneySerializer : Serializer {
  type T = Money
  @Encoder serialize(value: Money): Unit = encodeInt(value.pence)
  @Decoder deserialize(): Money = Money(decodeInt())
}
```

```fckt
Json.encode(MoneySerializer, Money(250))       // 250
Json.decode(MoneySerializer, "250")            // Ok(Money(pence=250))
```

A serializer doesn't know about JSON. `serialize` describes the value one piece at a time, through
the `Encoder` effect: a number, a string, the start of a record, a field's name, and so on.
`deserialize` asks for the pieces back through `Decoder`. JSON is one handler of those two effects,
so any serializer works with it. Another format would be another pair of handlers, and every
serializer would work with that too.

For records, lists, options and maps, `Encoding` and `Decoding` have helpers such as
`encodeList`, `decodeOption` and `required`. The serializers in `build/generated` are good
examples of how to use them.

A field whose type has a hand-written serializer can't be part of a `@Serializable` type yet.
Use the hand-written serializer on its own, as above.

## Shapes

Every generated serializer can describe the shape of what it writes: `NoteSerializer.describe()`
gives back a `Shape`, which lists each field's name and shape, and whether it can be left out.
[fk-http](/libraries/http#describing-a-service-with-openapi) uses shapes to write the schemas in
an OpenAPI document. A serializer written by hand describes itself as `UnknownShape` unless you
give it a `describe()` of its own.

## Reference

| | |
| --- | --- |
| `@Serializable` | Marks a type, so the processor writes a serializer for it. |
| `@SerialName("name")` | Writes a field or case under another name. |
| `@Transient` | Leaves a field out. It needs a default. |
| `Json.encode(serializer, value)` | The value as JSON text. |
| `Json.decode(serializer, text)` | The value the text describes, or why it isn't one. |
| `Json.toJson(serializer, value)` | The value as a `JsonValue`. |
| `Json.fromJson(serializer, json)` | The value a `JsonValue` describes, or why it isn't one. |
| `JsonText.read(text)` | JSON text as a `JsonValue`, or why it isn't valid. |
| `JsonText.of(json)` | A `JsonValue` as text. |
| `serializer.describe()` | The shape of what the serializer writes. |
