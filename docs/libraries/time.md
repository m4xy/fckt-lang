# Dates and times

[fk-time](https://github.com/m4xy/fk-time) works with days on the calendar and with moments as a
clock somewhere shows them. It builds on the standard library's `Instant`, a moment counted in
milliseconds since the start of 1970, and its `Clock` effect, which says what time it is now.

## Add it to your project

```fckt
project = Project(
  name = "diary",
  version = "0.1.0",
  dependencies = [library("uk.m4xy:fk-time:0.1.0")],
)
```

Then import it:

```fckt
import uk.m4xy.time.*
import uk.m4xy.time.Dates.*
import uk.m4xy.time.DateTimes.*
```

## Days

A `Date` is a year, a month from 1 to 12, and a day of the month. `Dates.of` checks that there is
such a day, and gives `None` if there isn't:

```fckt
Dates.of(2024, 2, 29)   // Some(Date(2024, 2, 29)): 2024 is a leap year
Dates.of(2023, 2, 29)   // None
```

You can ask a day what day of the week it is, and count forward or back from it:

```fckt
Date(2026, 10, 31).weekday                    // Saturday
Date(2026, 10, 31).plusDays(2)                // Date(2026, 11, 2)
Date(2024, 1, 31).plusMonths(1)               // Date(2024, 2, 29)
Date(2026, 1, 1).daysUntil(Date(2027, 1, 1))  // 365
```

Moving by months keeps the day of the month, unless the new month is shorter, in which case you
get its last day, as in the third line. All of these are exact for any year, before 1970 too,
because fk-time counts days the way Howard Hinnant's well-known calendar algorithms do.

`.iso` writes a day the way ISO 8601 does, and `Dates.parse` reads it back:

```fckt
Date(2026, 10, 31).iso        // "2026-10-31"
Dates.parse("2026-10-31")     // Some(Date(2026, 10, 31))
```

## Moments

An `Offset` says how far ahead of UTC a clock is, in minutes: `Offset(60)` for one hour ahead,
`Offset(-300)` for five hours behind. `at` gives the date and time an `Instant` shows on such a
clock, and `.instant` goes the other way:

```fckt
at(Instant(0))                     // DateTime(Date(1970, 1, 1), Time(0, 0))
iso(Instant(0), Offset(60))        // "1970-01-01T01:00:00+01:00"
DateTimes.parse("1969-07-20T20:17:00Z")
```

`DateTimes.parse` reads a moment written as ISO 8601, with `Z` for UTC or an offset such as
`+01:00`. The seconds and their fraction can be left out.

## Today

`today` asks the `Clock` what day it is, so in a test you can say what day it is by handling the
effect yourself:

```fckt
Clock(now = () -> Instant(0)) { today() }   // Date(1970, 1, 1)
```

fk-time doesn't know about time zones with rules, such as summer time in Europe/London: an offset
is a fixed number of minutes.
