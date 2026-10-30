# Collections

Lists are built into the language, and [Collections and text](/collections) covers them. The
`fckt.collections` package adds maps, sets, arrays and streams.

| Import | What it's for |
| --- | --- |
| `fckt.collections.Maps.*` | `Map<K, V>`: values looked up by a key |
| `fckt.collections.Sets.*` | `Set<A>`: items with no repeats |
| `fckt.collections.Array`, `fckt.collections.Arrays.*` | A fixed number of slots you can change in place |
| `fckt.collections.Stream`, `fckt.collections.Streams.*` | Values worked out as you read them, possibly forever |

## Maps

A map holds values, each under a key. Make one from a list of pairs with `mapOf`, and look a key up
with square brackets. A lookup gives an `Option`, since the key might not be there:

```fckt
import fckt.collections.Maps.*

ages = mapOf([("Ada", 36), ("Alan", 41)])

ages["Ada"]                     // Some(36)
ages["Grace"]                   // None
ages.getOrDefault("Grace", 0)   // 0
ages.size                       // 2
```

A map never changes. `put` and `remove` give you a new map, and the old one stays as it was. The
new map shares most of its structure with the old one, so this is cheap:

```fckt
import fckt.collections.Maps.*

ages = mapOf([("Ada", 36), ("Alan", 41)])
older = ages.put("Ada", 37).put("Grace", 85)

older                           // {Ada=37, Alan=41, Grace=85}
ages                            // {Ada=36, Alan=41}
older.remove("Alan")            // {Ada=37, Grace=85}
```

The keys are always kept in order, smallest first. Two maps with the same entries are equal, no
matter what order the entries were added in.

### Working with a map's entries

```fckt
import fckt.collections.Maps.*

stock = mapOf([("apples", 3), ("pears", 0), ("plums", 12)])

stock.keys                                  // [apples, pears, plums]
stock.values                                // [3, 0, 12]
stock.filterValues { it > 0 }               // {apples=3, plums=12}
stock.mapValues { _, n -> n * 2 }           // {apples=6, pears=0, plums=24}
stock.map { name, n -> "$n $name" }         // [3 apples, 0 pears, 12 plums]
stock.any { _, n -> n == 0 }                // true
```

| Function | What it gives |
| --- | --- |
| `get(key)`, `m[key]` | The key's value, or `None` |
| `getOrElse(key) { ... }`, `getOrDefault(key, value)` | The key's value, or a fallback |
| `containsKey(key)` | Whether the key is there |
| `put(key, value)`, `remove(key)` | A new map with the change |
| `putAll(other)` | A new map with every entry of `other` added, replacing any with the same key |
| `entries`, `keys`, `values` | Lists, in key order |
| `filter`, `filterKeys`, `filterValues` | A new map with only the entries that pass |
| `mapValues`, `mapKeys` | A new map with each value or key changed |
| `map`, `forEach`, `any`, `all`, `count` | Each entry in key order, as a key and a value |
| `intersectKeys(other)`, `subtractKeys(other)` | The entries whose keys are, or aren't, in `other` |

### Making a map from a list

Several functions build a map from a list you already have:

```fckt
import fckt.collections.Maps.*

words = ["apple", "avocado", "banana", "cherry"]

words.groupBy { it.length }         // {5=[apple], 6=[banana, cherry], 7=[avocado]}
words.associateWith { it.length }   // {apple=5, avocado=7, banana=6, cherry=6}
```

`groupBy` puts every item under its key, in a list. `associateBy` and `associateWith` keep one item
per key: if two items have the same key, the later one wins.

## Sets

A set holds items with no repeats. Like a map's keys, a set's items are kept in order:

```fckt
import fckt.collections.Sets.*

seen = setOf([3, 1, 2, 1])

seen                            // [1, 2, 3]
seen.contains(2)                // true
seen + 5                        // [1, 2, 3, 5]
seen - 1                        // [2, 3]
```

`+` and `-` give a new set with one item added or taken out. To combine two sets, use `union`,
`intersect` and `subtract`:

```fckt
import fckt.collections.Sets.*

mine = setOf(["tea", "toast", "jam"])
yours = setOf(["tea", "coffee"])

mine.union(yours)               // [coffee, jam, tea, toast]
mine.intersect(yours)           // [tea]
mine.subtract(yours)            // [jam, toast]
```

A set also has `size`, `toList`, `filter`, `map`, `forEach`, `any`, `all` and `count`. `map` gives a
list, because two items can map to the same value.

## Arrays

An array has a fixed number of slots, and you can change what's in each one. `arrayOf(size, value)`
makes one with every slot set to `value`:

```fckt
import fckt.collections.Array
import fckt.collections.Arrays.*

squares(n: Int): List<Int> = {
  slots = arrayOf(n, 0)
  (0..<n).forEach { slots[it] = it * it }
  slots.toList()
}

squares(5)                      // [0, 1, 4, 9, 16]
```

Reading a slot with `slots[i]` and writing one with `slots[i] = v` are both quick, however big the
array is. Writing a slot is `@Mutating`, but only on that array. An array made and changed inside a
function doesn't make the function itself `@Mutating`, so `squares` above is pure.

`toArray()` turns a list into an array, `toList()` turns it back, and `size` is the number of slots.

## Streams

A stream is a list that's worked out as you read it, so it can go on forever. You usually make one
with a [generator](/standard-library/effects#generators), and read it with `take`:

```fckt
import fckt.effects.Generators.*
import fckt.effects.Yielding
import fckt.collections.Streams.*

@Yielding<Int> powersOfTwo(n: Int): Unit = {
  yield(n)
  powersOfTwo(n * 2)
}

sequence { powersOfTwo(1) }.take(6)     // [1, 2, 4, 8, 16, 32]
```

`powersOfTwo` never stops on its own. Each value is only worked out when `take` asks for it, so the
stream ends up computing exactly six of them.

A stream is either `End` or `Next(value, rest)`, where `rest` is a [lazy value](/collections#lazy-values).
You can take one apart with `when` like any other type.
