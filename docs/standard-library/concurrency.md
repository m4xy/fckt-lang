# Concurrency

The `fckt.concurrent` package lets one program do several things at once, as tasks that take turns.
`fckt.io.Polls` builds on it, so a task can wait for time to pass, or for input to arrive, while the
others carry on.

| Import | What it's for |
| --- | --- |
| `fckt.concurrent.*` | `launch`, `join`, `pause`, `park` and `wake`, and the `InTurn` executor |
| `fckt.io.Polls` | Running tasks that wait for time or for files and connections |

## Tasks

`launch` starts a task. `InTurn.run` runs a block, and every task launched inside it, until they've
all finished:

```fckt
import fckt.concurrent.*
import fckt.effects.Failure.*
import fckt.values.Mutable

log = Mutable([])
said = (line: String) -> { log.value = log.value + [line] }

attempt {
  InTurn.run {
    a = launch { said("a1"); pause(); said("a2") }
    b = launch { said("b1"); join(a); said("b after a") }
    said("main")
    join(b)
    42
  }
}                               // Ok(42)

log.value                       // [main, a1, b1, a2, b after a]
```

Only one task runs at a time. It keeps running until it finishes, or until it does one of these:

| Call | What happens |
| --- | --- |
| `pause()` | The task lets the others have a turn, then carries on |
| `join(task)` | The task waits until `task` has finished |
| `park { ... }` | The task waits until something wakes it |

Because a task is never interrupted in the middle of something, two tasks can't see each other
halfway through a change. In the example, `main` runs first, because launching a task only puts it
in the queue. When `main` waits for `b`, the queued tasks get their turn.

`InTurn.run` gives back what the block gives back, once every task has finished. If every task is
waiting and nothing can wake any of them, it [fails](/standard-library/effects#failing) and says so,
rather than waiting forever:

```fckt
import fckt.concurrent.*
import fckt.effects.Failure.*

attempt {
  InTurn.run {
    a = launch { pause() }
    join(a)
    park { Unit }
  }
}                               // Error(every task is waiting, for what nothing will bring)
```

## Waking a task

`park` puts a task to sleep and hands you a `Waker` for it. Keep the waker somewhere, and when the
thing the task is waiting for has happened, pass it to `wake`:

```fckt
import fckt.concurrent.*
import fckt.effects.Failure.*
import fckt.values.Mutable

log = Mutable([])
sleeping: Mutable<Option<Waker>> = Mutable(None)

attempt {
  InTurn.run {
    launch {
      log.value = log.value + ["waiting"]
      park { sleeping.value = Some(it) }
      log.value = log.value + ["woken"]
    }
    pause()
    log.value = log.value + ["waking it"]
    sleeping.value.forEach { wake(it) }
  }
}

log.value                       // [waiting, waking it, woken]
```

This is how you build things like queues and locks: a task that has to wait parks, and whichever
task makes the wait over wakes it.

## Waiting for time and input

`InTurn.run` only switches tasks when one of them pauses, waits or finishes. `Polls.running` does
the same, but its tasks can also wait for the outside world:

```fckt
import fckt.concurrent.*
import fckt.io.Polls
import fckt.io.Polls.*
import fckt.time.Duration

main() = {
  done = Polls.running {
    launch { sleep(Duration(60)); println("slow") }
    launch { sleep(Duration(10)); println("fast") }
    println("started")
    "slept"
  }
  println(done)
}
```

```
started
fast
slow
slept
```

While every task is waiting, `Polls.running` asks the system to wake it as soon as any of them can
go on, whichever comes first. A sleeping task doesn't hold up the others.

| Function | What the task waits for |
| --- | --- |
| `sleep(duration)` | `duration` to pass |
| `awaitReadable(descriptor)` | Something to read on a socket, pipe or terminal |
| `awaitWritable(descriptor)` | Room to write to one |
| `awaitReadableFor(descriptor, duration)`, `awaitWritableFor(descriptor, duration)` | The same, giving up after `duration`. They give back `false` if the time ran out. |

Libraries such as [fk-http](https://github.com/m4xy/fk-http) use these to serve many connections at
once from a single thread.

## Choosing an executor

`InTurn` is an `Executor`, the spec for anything that decides which task runs next. `Polls.running`
takes the executor as a parameter, and uses `InTurn` unless you give it another. A test can pass an
executor of its own to run tasks in a particular order.
