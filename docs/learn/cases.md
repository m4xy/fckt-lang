# Types with cases

Some values are one of a few kinds. Declare the kinds as cases of a type, each with its own fields
if it needs them:

```fckt
type Shape {
  Circle(radius: Float)
  Square(side: Float)
}
```

`when` looks at which case a value is and gives back a result for each. With `is`, the branch can
read that case's fields:

```fckt
area(shape: Shape): Float = when (shape) {
  is Circle -> 3.0 * shape.radius * shape.radius
  is Square -> shape.side * shape.side
}

area(Square(3.0))               // 9.0
```

A `when` needs a branch for every case. If you add a case to the type later, every `when` that
doesn't handle it stops compiling until it does.

## Your task

A café sells three drinks. Water is free, tea costs 2, and a coffee costs 3 plus 1 for every extra
shot. Write `price`.

```fckt lesson-starter
type Drink {
  Water
  Tea
  Coffee(extraShots: Int)
}

price(drink: Drink): Int = 0
```

```fckt lesson-solution
type Drink {
  Water
  Tea
  Coffee(extraShots: Int)
}

price(drink: Drink): Int = when (drink) {
  is Water -> 0
  is Tea -> 2
  is Coffee -> 3 + drink.extraShots
}
```

```fckt lesson-check
main() = {
  expect(price(Water) == 0, "water costs ${price(Water)}, but it should be free")
  expect(price(Tea) == 2, "tea costs ${price(Tea)}, but it should cost 2")
  expect(price(Coffee(0)) == 3, "a coffee costs ${price(Coffee(0))}, but it should cost 3")
  expect(price(Coffee(2)) == 5, "a coffee with 2 extra shots costs ${price(Coffee(2))}, but it should cost 5")
}
```

```text lesson-hint
Start with when (drink) { ... } and a branch for each case: is Water -> 0.
```

```text lesson-hint
In the Coffee branch, drink.extraShots is the number of extra shots.
```
