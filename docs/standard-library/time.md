# Time

The `fckt.time` package has types for moments and lengths of time, and the `Clock` effect for
asking what time it is.

| Import | What it's for |
| --- | --- |
| `fckt.time.Instant` | A moment in time |
| `fckt.time.Duration` | A length of time |
| `fckt.time.Times.*` | Adding durations, and the time between two instants |
| `fckt.time.Clock` | The `@Clock` effect, with `now()` |

## Instants and durations

An `Instant` is a moment, counted in milliseconds since the start of 1970 in UTC. A `Duration` is a
length of time, also in milliseconds:

```fckt
import fckt.time.Instant
import fckt.time.Duration
import fckt.time.Times.*

start = Instant(1000)
later = start + Duration(250)

later                           // Instant(millis=1250)
start.until(later)              // Duration(millis=250)
Duration(1500) + Duration(500)  // Duration(millis=2000)
```

`until` gives the time from one instant to another. It's negative if the second instant comes
first.

Both types are records with one field, `millis`, so you can do any other arithmetic on that:

```fckt
import fckt.time.Duration

seconds(d: Duration): Float = d.millis.toFloat() / 1000.0

seconds(Duration(2500))         // 2.5
```

## Asking the time

`now()` gives the current time as an `Instant`. It belongs to the `Clock` effect, so a function
that asks the time says `@Clock`:

```fckt
import fckt.time.Clock
import fckt.time.Instant
import fckt.time.Duration
import fckt.time.Times.*

@Clock elapsed(start: Instant): Duration = start.until(now())
```

In a running program, `main` answers `now()` with the system clock. That's the wall clock, which can
jump if someone changes the computer's time, so it's good for timing things roughly but not to the
millisecond.

Because the time comes from an effect, a test can answer `now()` with a fixed time instead, and get
the same result every run:

```fckt
import fckt.time.Clock
import fckt.time.Instant
import fckt.time.Duration
import fckt.time.Times.*

@Clock elapsed(start: Instant): Duration = start.until(now())

Clock(now = ~Instant(5000)) { elapsed(Instant(2000)) }   // Duration(millis=3000)
```

## Timing something

To see how long some work takes, read the clock before and after:

```fckt
import fckt.time.Clock
import fckt.time.Times.*

main() = {
  start = now()
  total = (1..1000000).fold(0) { acc, n -> acc + n }
  println("$total in ${start.until(now()).millis}ms")
}
```

To wait for some time to pass without holding up other tasks, use `sleep` from
[`fckt.io.Polls`](/standard-library/concurrency#waiting-for-time-and-input).
