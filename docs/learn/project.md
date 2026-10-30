# Putting it together

The last lesson uses most of what came before: a type with cases, `when`, records, lists and
`Result`.

A to-do list is a list of tasks. Commands change it: `Add` puts a task on the end, `Finish` marks
one done by its number, counting from 1, and `ClearDone` removes the finished ones. Finishing a
task that isn't there is an error.

`mapIndexed` is like `map`, but its block gets each item's position as well, counting from 0.
`foldResult` is like `fold`, but its block gives back a `Result`, and it stops at the first `Error`.

```fckt
[10, 20, 30].mapIndexed { i, n -> n + i }                 // [10, 21, 32]
[1, 2, 3].foldResult(0) { total, n -> if (n < 0) Error("$n is negative") else Ok(total + n) }
// Ok(6)
```

## Your task

Write `apply`, which applies one command to a list of tasks, and `applyAll`, which applies a list of
commands in order, stopping at the first error.

```fckt lesson-starter
type Task(title: String, done: Boolean = false)

type Command {
  Add(title: String)
  Finish(number: Int)
  ClearDone
}

apply(tasks: List<Task>, command: Command): Result<List<Task>, String> = Ok(tasks)

applyAll(commands: List<Command>): Result<List<Task>, String> = Ok([])
```

```fckt lesson-solution
type Task(title: String, done: Boolean = false)

type Command {
  Add(title: String)
  Finish(number: Int)
  ClearDone
}

apply(tasks: List<Task>, command: Command): Result<List<Task>, String> = when (command) {
  is Add -> Ok(tasks + [Task(command.title)])
  is Finish ->
    if (command.number < 1 || command.number > tasks.size) Error("there's no task ${command.number}")
    else Ok(tasks.mapIndexed { i, task -> if (i == command.number - 1) task.copy(done = true) else task })
  is ClearDone -> Ok(tasks.filter { !it.done })
}

applyAll(commands: List<Command>): Result<List<Task>, String> =
  commands.foldResult([]) { tasks, command -> apply(tasks, command) }
```

```fckt lesson-check
main() = {
  added = applyAll([Add("Buy milk"), Add("Write docs")])
  expect(added == Ok([Task("Buy milk"), Task("Write docs")]), "adding two tasks gave $added")
  finished = applyAll([Add("Buy milk"), Add("Write docs"), Finish(2)])
  expect(finished == Ok([Task("Buy milk"), Task("Write docs", true)]), "finishing task 2 gave $finished")
  cleared = applyAll([Add("Buy milk"), Add("Write docs"), Finish(1), ClearDone])
  expect(cleared == Ok([Task("Write docs")]), "clearing finished tasks gave $cleared")
  missing = applyAll([Add("Buy milk"), Finish(3), Add("Never added")])
  expect(missing == Error("there's no task 3"), "finishing a task that isn't there gave $missing")
}
```

```text lesson-hint
apply is a when (command) with a branch for each case. Add is Ok(tasks + [Task(command.title)]).
```

```text lesson-hint
For Finish, mark the task whose position is command.number - 1: tasks.mapIndexed { i, task -> if (i == command.number - 1) task.copy(done = true) else task }.
```

```text lesson-hint
applyAll starts from an empty list: commands.foldResult([]) { tasks, command -> apply(tasks, command) }.
```
