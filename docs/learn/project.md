# Putting it together

The last lesson uses most of what came before: a type with cases, `when`, records, lists and
`Result`.

A to-do list is a list of tasks. Commands change it: `Add` puts a task on the end, `Finish` marks a
task done by its title, and `ClearDone` removes the finished ones. Finishing a task that isn't on
the list is an error: `there's no task called ` and the title, like `there's no task called Walk the
dog`.

`any` says whether any item passes a test. `foldResult` is like `fold`, but its block gives back a
`Result`, and it stops at the first `Error`:

```fckt
["milk", "docs"].any { it == "docs" }                       // true
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
  Finish(title: String)
  ClearDone
}

apply(tasks: List<Task>, command: Command): Result<List<Task>, String> = Ok(tasks)

applyAll(commands: List<Command>): Result<List<Task>, String> = Ok([])
```

```fckt lesson-solution
type Task(title: String, done: Boolean = false)

type Command {
  Add(title: String)
  Finish(title: String)
  ClearDone
}

apply(tasks: List<Task>, command: Command): Result<List<Task>, String> = when (command) {
  is Add -> Ok(tasks + [Task(command.title)])
  is Finish ->
    if (!tasks.any { it.title == command.title }) Error("there's no task called ${command.title}")
    else Ok(tasks.map { if (it.title == command.title) it.copy(done = true) else it })
  is ClearDone -> Ok(tasks.filter { !it.done })
}

applyAll(commands: List<Command>): Result<List<Task>, String> =
  commands.foldResult([]) { tasks, command -> apply(tasks, command) }
```

```fckt lesson-check
main() = {
  added = applyAll([Add("Buy milk"), Add("Write docs")])
  expect(added == Ok([Task("Buy milk"), Task("Write docs")]), "adding two tasks gave $added")
  finished = applyAll([Add("Buy milk"), Add("Write docs"), Finish("Write docs")])
  expect(finished == Ok([Task("Buy milk"), Task("Write docs", true)]), "finishing Write docs gave $finished")
  cleared = applyAll([Add("Buy milk"), Add("Write docs"), Finish("Buy milk"), ClearDone])
  expect(cleared == Ok([Task("Write docs")]), "clearing finished tasks gave $cleared")
  missing = applyAll([Add("Buy milk"), Finish("Walk the dog"), Add("Never added")])
  expect(missing == Error("there's no task called Walk the dog"), "finishing a task that isn't there gave $missing")
}
```

```text lesson-hint
apply is a when (command) with a branch for each case. Add is Ok(tasks + [Task(command.title)]).
```

```text lesson-hint
For Finish, first check the task is there with tasks.any { it.title == command.title }, then map
over the tasks, copying the one with that title with done = true.
```

```text lesson-hint
applyAll starts from an empty list: commands.foldResult([]) { tasks, command -> apply(tasks, command) }.
```
