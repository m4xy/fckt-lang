# Effects

A function that does something besides work out its result, like printing or asking the time, says
so before its name. That's an effect. You can declare your own, with the operations it offers:

```fckt
effect Clock { hour(): Int }

@Clock opening(): String = if (hour() < 9) "closed" else "open"
```

`opening` calls `hour()` but doesn't decide what the hour is. Whatever runs it does, by handling the
effect. Here the clock says 7, then 10:

```fckt
Clock(hour = ~7) { opening() }   // closed
Clock(hour = ~10) { opening() }  // open
```

Because the hour comes from outside, `opening` is as easy to test at 7 in the morning as at noon.

## Your task

`greeting` should say `Good morning, ` and the name before 12, and `Good afternoon, ` and the name
from 12 on. It needs to know the hour, so it has to use `Clock`.

```fckt lesson-starter
effect Clock { hour(): Int }

greeting(name: String): String = "Hello, $name"
```

```fckt lesson-solution
effect Clock { hour(): Int }

@Clock greeting(name: String): String =
  if (hour() < 12) "Good morning, $name" else "Good afternoon, $name"
```

```fckt lesson-check
main() = {
  morning = Clock(hour = ~9) { greeting("Ada") }
  noon = Clock(hour = ~12) { greeting("Ada") }
  evening = Clock(hour = ~18) { greeting("Grace") }
  expect(morning == "Good morning, Ada", "at 9, greeting gave '$morning'")
  expect(noon == "Good afternoon, Ada", "at 12, greeting gave '$noon'")
  expect(evening == "Good afternoon, Grace", "at 18, greeting gave '$evening'")
}
```

```text lesson-hint
Put @Clock before the function's name, so it can call hour().
```

```text lesson-hint
@Clock greeting(name: String): String = if (hour() < 12) ... else ...
```
