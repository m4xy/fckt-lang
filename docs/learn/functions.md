# Functions

A function has a name, its parameters in parentheses, `=`, and the expression it gives back:

```fckt
double(x: Int) = x * 2

double(21)                      // 42
```

Each parameter needs its type. You can also write the type the function gives back, after the
parameters: `double(x: Int): Int = x * 2`.

When a function needs more than one step, give it a block. Each line can name a value, and the last
line is what the function gives back:

```fckt
describe(x: Int): String = {
  doubled = double(x)
  "$x doubled is $doubled"
}

describe(4)                     // 4 doubled is 8
```

## Your task

Write `area`, which gives the area of a rectangle from its width and height. Then write `label`,
which uses `area` to describe a rectangle: `label(3, 4)` should give `3 by 4 is 12`.

```fckt lesson-starter
area(width: Int, height: Int): Int = 0

label(width: Int, height: Int): String = "?"
```

```fckt lesson-solution
area(width: Int, height: Int): Int = width * height

label(width: Int, height: Int): String = "$width by $height is ${area(width, height)}"
```

```fckt lesson-check
main() = {
  expect(area(3, 4) == 12, "area(3, 4) gave ${area(3, 4)}, but it should be 12")
  expect(area(5, 1) == 5, "area(5, 1) gave ${area(5, 1)}, but it should be 5")
  expect(label(3, 4) == "3 by 4 is 12", "label(3, 4) gave '${label(3, 4)}', but it should be '3 by 4 is 12'")
  expect(label(2, 2) == "2 by 2 is 4", "label(2, 2) gave '${label(2, 2)}', but it should be '2 by 2 is 4'")
}
```

```text lesson-hint
The area of a rectangle is its width times its height: width * height.
```

```text lesson-hint
Inside a template, ${...} can hold a call: "${area(width, height)}".
```
