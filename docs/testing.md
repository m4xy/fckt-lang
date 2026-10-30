# Testing

Tests in fckt are written with [fk-tests](https://github.com/m4xy/fk-tests). A test is a function
marked `@Test`. Each test runs on its own, so one failing doesn't stop the others.

## Set up

Add fk-tests' kiln plugin to your project. List it in `settings.fk`, then apply it in `build.fk`:

```fckt
// settings.fk
settings = Settings(uses = [library("uk.m4xy:fk-tests-kiln:0.1.0")])
```

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt
import uk.m4xy.fktests.kiln.*

project = Project(name = "shop", version = "0.1.0")

plugins = [Fckt(), FkTests()]
```

This adds a `test` task, which is part of `check`, so `kiln build` runs your tests too.

## Write a test

Tests go in a `test` folder beside `src`. Suppose `src/pricing/Prices.fk` has this:

```fckt
module Prices {
  total(items: List<Int>): Int = items.sum()
}
```

Then `test/prices.fk` can test it:

```fckt
import uk.m4xy.fktests.api.Test
import pricing.Prices

@Test sumsItems() = assert(Prices.total([1, 2, 3]) == 6)
@Test emptyIsZero() = assertEquals(0, Prices.total([]))
```

A test is a function with no parameters. Check things inside it with:

- `assert(condition)`, which fails if the condition is false
- `assertEquals(expected, actual)`, which fails if the two values differ, and shows both
- `fail(reason)`, which fails with your own message

## Run the tests

```sh
kiln test
```

```
> Task :test
  prices.fk
    passed sumsItems
    passed emptyIsZero
  2 passed, 0 failed
BUILD SUCCESSFUL
```

When a test fails, you see the file, the line and what went wrong:

```
    FAILED wrongTotal: broken.fk line 4: expected:<7> but was:<6>
  5 passed, 1 failed
BUILD FAILED: tests failed
```

To run only some tests, name them after `--`:

```sh
kiln test -- sumsItems             # every test with that name
kiln test -- prices.fk             # every test in a file
kiln test -- prices.fk::sumsItems  # one test
kiln test -- prices.fk::Totals     # every test in a section
```

## Group tests into sections

Put tests in a module to group them. The module becomes a section, and its tests are reported with
its name:

```fckt
module Totals {
  @Test singleItem() = assertEquals(5, Prices.total([5]))
}
```

```
  prices.fk
    passed Totals.singleItem
```

Other files in the `test` folder that don't have tests in them are shared helpers. Any test file can
use them.

## Tests and effects

A test can use [effects](/effects) the same way `main` can. If it prints, it prints to the terminal.

Often, though, you want to control an effect instead: answer it with known values, or record what
the code did. You can do that by handling the effect inside the test. When several tests need the
same handler, write it once as a fixture.

## Fixtures

A fixture is a function that runs a test inside something. It takes the test as a parameter, and
can handle the effects the test uses.

Here, the code being tested records sales through a `Ledger` effect. The fixture `inLedger` runs
each test with a ledger that keeps lines in a list:

```fckt
import uk.m4xy.fktests.api.*

effect Ledger {
  record(line: String): Unit
  lines(): List<String>
}

inLedger<A>(test: @Ledger () -> A): A = {
  var kept: List<String> = []
  Ledger(record = line -> { kept = kept + [line] }, lines = () -> kept) { test() }
}

@Ledger recordSale(item: String) = record("sold $item")

@Ledger @Fixtures(inLedger)
module Sales {
  @Test startsEmpty() = assertEquals([], lines())
  @Test recordsASale() = {
    recordSale("tea")
    assertEquals(["sold tea"], lines())
  }
}
```

`@Fixtures(inLedger)` on the module applies the fixture to every test in it, and each test gets a
fresh ledger. You can also put `@Fixtures` on a single test. When a test has several fixtures, the
first one listed runs outermost, and a section's fixtures run outside its tests' own.

A fixture only applies where you name it. If a test uses an effect that nothing handles, you get an
error when the tests compile.

## Check that a format reads back what it writes

The standard library's `Format` turns values into text and back. To test one, use
`Formats.assertReadsBack`, which fails unless reading back what the format writes gives you the
original value:

```fckt
@Test settingsReadBack() = Formats.assertReadsBack(SettingsText, settings)
```

## Tests in other folders

By default, tests live in `test`. To use other folders, configure the plugin with a module that
follows `TestConfiguration`:

```fckt
module Mine : TestConfiguration {
  roots(): List<TestRoot> = [TestRoot(path("test")), TestRoot(path("integration"))]
}

plugins = [Fckt(), FkTests(Mine)]
```
