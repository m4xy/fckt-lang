# Mutation

Values in fckt don't change unless you say they can. When you do need something that changes, such
as a counter or a balance, you mark it with `var`. Changing it is an effect, `@Mutating`, but only
when someone outside the function could notice.

## Local variables

A `var` declared inside a function can be changed with `=`, `+=` and the other assignment
operators:

```fckt
count(xs: List<Int>): Int = {
  var n = 0
  xs.forEach { n += 1 }
  n
}

count([4, 5, 6])                // 3
```

`count` declares no effects. `n` belongs to this call of `count`, and nothing outside can see it
change.

## Fields that can change

Mark a field `var` to let it change after the value is made:

```fckt
type Account(owner: String, var balance: Int)

@Mutating deposit(account: Account, amount: Int) = {
  account.balance += amount
}
```

`deposit` changes an account that its caller passed in, and the caller can see the new balance, so
it declares `@Mutating`. Without it, you get an error:

```
error: 'deposit' does @Mutating, so it must say so: @Mutating deposit(...)
```

Fields without `var` can't be changed. Changing `x` on a `Point` from [Types](/types) gives this error:

```
error: Point's x can't be changed; declare it with var x: ...
```

## Changes that stay inside a function

If a function makes a value and changes it, but the value never leaves the function, nobody outside
can see the change. The function is still pure:

```fckt
total(amounts: List<Int>): Int = {
  account = Account("total", 0)
  amounts.forEach { deposit(account, it) }
  account.balance
}

total([1, 2, 3])                // 6
```

`total` calls `deposit`, which is `@Mutating`, but only on an account it made itself. Only the
number leaves, so `total` declares nothing.

## Changes that leave a function

If the changed value is returned, or stored somewhere the caller can reach, the change goes with
it, and the function is `@Mutating`:

```fckt
@Mutating opened(owner: String, first: Int): Account = {
  account = Account(owner, 0)
  deposit(account, first)
  account
}
```

The same goes for functions you return. Calling `counter` changes nothing, but the function it
returns changes `n` each time it runs, so its type says so:

```fckt
counter(): @Mutating () -> Int = {
  var n = 0
  ~{
    n += 1
    n
  }
}

next = counter()
next()
next()                          // 2
```

## Cases with fields that can change

The fields of a type's cases can be `var` too. You can change one after checking which case the
value is, as `is Node` does here:

```fckt
type Tree { Leaf, Node(var left: Tree, value: Int, var right: Tree) }

@Mutating insert(tree: Tree, x: Int): Tree = when (tree) {
  is Leaf -> Node(Leaf, x, Leaf)
  is Node -> {
    if (x < tree.value) {
      tree.left = insert(tree.left, x)
    } else {
      tree.right = insert(tree.right, x)
    }
    tree
  }
}

toList(tree: Tree): List<Int> = when (tree) {
  Leaf -> []
  Node(left, value, right) -> [*toList(left), value, *toList(right)]
}

sorted(xs: List<Int>): List<Int> = {
  var tree = Leaf
  xs.forEach { tree = insert(tree, it) }
  toList(tree)
}

sorted([5, 3, 8, 1, 2])         // [1, 2, 3, 5, 8]
```

`sorted` builds and changes a tree, but only a list leaves it, so it's pure.

## Arrays

An `Array` has a fixed size, and you read and write its items by index:

```fckt
import fckt.collections.Array
import fckt.collections.Arrays.*

squares(n: Int): List<Int> = {
  xs = arrayOf(n, 0)
  (0..<n).forEach { xs[it] = it * it }
  xs.toList()
}

squares(5)                      // [0, 1, 4, 9, 16]
```

`arrayOf(n, 0)` makes an array of `n` zeros. `xs[i]` calls `xs.get(i)`, and `xs[i] = v` calls
`xs.set(i, v)`, so any type with `get` and `set` can be used with square brackets.

## A single changeable value

`Mutable` holds one value that can change. It's handy for state that lives at the top level of a
program, where `var` isn't allowed:

```fckt
import fckt.values.Mutable

hits = Mutable(0)

@Mutating hit() = { hits.value += 1 }

hit()
hit()
hits.value                      // 2
```
