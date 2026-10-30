# Building with kiln

kiln is fckt's build tool. It compiles your project, runs it, runs its tests, and publishes it as a
library for other projects to use. Build scripts are written in fckt, and so is kiln itself.

If you haven't installed kiln yet, [Getting started](/getting-started#install-kiln) shows how.

## Projects

A kiln project is a folder with a `build.fk` file. The smallest one names the project and applies
the `Fckt` plugin, which knows how to build fckt code:

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt

project = Project(name = "hello", version = "0.1.0")

plugins = [Fckt()]
```

Your code goes in `src`. Each folder inside it is a package. If there's a `src/main.fk`, the project
is a program, and kiln compiles it to `build/bin/<name>`. If there isn't, the project is a library,
and kiln checks it and writes its interface to `build/library`.

## Describing the project

`Project` has these fields. Only `name` is required:

```fckt
project = Project(
  name = "shop",
  version = "0.1.0",
  group = "",                     // who publishes it, such as uk.m4xy
  dependencies = [],              // other libraries and projects it uses
  output = path("build"),         // where build output goes
)
```

You need a `group` only if you want to publish the project as a library.

## Running tasks

You build a project by running its tasks. Every project has these:

| Task | What it does |
| --- | --- |
| `clean` | Deletes the `build` folder |
| `check` | Runs every task that checks the project, such as compiling and testing |
| `build` | Runs `check`, then any other tasks that are part of building |
| `tasks` | Lists the project's tasks |

The `Fckt` plugin adds these:

| Task | What it does |
| --- | --- |
| `compile` | Compiles the program to `build/bin/<name>`, or checks the library. It's part of `check`. |
| `run` | Runs the program |
| `publishLocal` | Checks the project, then publishes it to your local repository |
| `roots` | Prints the folders the project's packages are in, and the libraries it uses |

Name several tasks to run them in turn, and put anything you want to pass to them after `--`:

```sh
kiln clean build
kiln run -- some arguments
kiln -C ../other-project build     # builds the project in another folder
```

kiln runs each task once, after the tasks it depends on. It skips work that's already done: if your
sources, libraries and tools haven't changed since the last build, it doesn't compile again.

## Adding your own tasks

To add a task, give it a name and declare it in `tasks`:

```fckt
import uk.m4xy.kiln.fckt.Fckt
import uk.m4xy.kiln.fckt.FcktTasks

project = Project(name = "shop", version = "0.1.0")

plugins = [Fckt()]

stamp = Named("stamp")

tasks = [
  Task(stamp, "Writes the version", dependsOn = [FcktTasks.compile], action = build -> build.project.output.resolve("VERSION").writeText(build.project.version)),
]
```

`kiln stamp` now compiles the project, then writes its version to `build/VERSION`.

A task has a name, a description, the tasks it depends on (`dependsOn`), the tasks it's part of
(`partOf`), and an action. The action is a function that's given the build, so it can read the
project's settings, work with files and run other programs. A task that's `partOf = [Check]` runs
whenever `check` does.

Task names are values, not strings. The standard ones are `Clean`, `Check` and `Build`, and the
`Fckt` plugin's are in `FcktTasks`. For your own, create one with `Named("...")` and use that value
everywhere, so a misspelt name is a compile error. The command line is the only place you type a
task's name as text.

## Plugins

A plugin adds tasks to a project. The `Fckt` plugin comes with kiln. Others come from libraries,
which you list in a `settings.fk` file beside `build.fk`:

```fckt
// settings.fk
settings = Settings(uses = [library("uk.m4xy:fk-tests-kiln:0.1.0")])
```

```fckt
// build.fk
import uk.m4xy.kiln.fckt.Fckt
import uk.m4xy.fktests.kiln.*

project = Project(name = "shop")

plugins = [Fckt(), FkTests()]
```

This is how you add testing; see [Testing](/testing).

### Writing a plugin

A plugin is a module that follows kiln's `Plugin` spec. It gives its name and the tasks it adds:

```fckt
spec Words {
  greeting(): String
}

module Hello : Words {
  greeting(): String = "hello"
}

module Greetings(W: Words = Hello) : Plugin {
  name(): String = "greetings"
  tasks(project: Project): List<Task> = [Task(Named("greet"), "Greets the project", action = build -> println(W.greeting()))]
}
```

`Greetings` is a functor, so it can be configured: `Greetings()` uses `Hello`, and
`Greetings(W = Howdy)` uses whatever `Howdy` module the build script defines. The plugin's project
depends on kiln's library with `dependencies = [kiln()]`.

Plugins only add tasks; they never change each other's. Two plugins can't add tasks with the same
name.

## settings.fk

`settings.fk` holds what applies to a whole build, rather than to one project:

```fckt
settings = Settings(
  repositories = [At(path("../team-repository")), Local],
  uses = [library("uk.m4xy:fk-tests-kiln:0.1.0")],
  projects = [path("runner"), path("kiln")],
)
```

- `repositories` lists where libraries are looked for, in order. `Local` is your local repository,
  `~/.kiln/repository`. `At(...)` is any folder laid out the same way.
- `uses` lists the libraries build scripts can use, for the plugins they apply.
- `projects` lists other projects to build along with this one. Running `kiln build` here builds
  each of them first.

You only need `settings.fk` if you use plugins from libraries, or libraries from somewhere other
than your local repository.

## Dependencies

List the libraries and projects your project uses in `dependencies`:

```fckt
project = Project(name = "till", dependencies = [library("uk.m4xy:fk-regex:0.1.0"), projectAt("../shop")])
```

`library("group:name:version")` uses a published library. `projectAt("../shop")` uses another
project straight from its folder, as it is right now, so you can work on both at once.

kiln compiles each library once, the first time a build needs it, and keeps the result in
`~/.kiln/cache`. If two dependencies ask for different versions of the same library, kiln uses the
higher one.

To see where a project's code comes from, run `kiln --quiet roots`:

```
root src
root ../shop/src
library uk.m4xy:fk-regex:0.1.0
repository local
```

## Publishing a library

To publish a project as a library, give it a `group`, a reversed domain name you own, and put its
packages in folders that match:

```fckt
// units/build.fk, with its packages in src/uk/m4xy/units
project = Project(name = "units", group = "uk.m4xy", version = "1.0.0")
```

Then run:

```sh
kiln publishLocal
```

This checks the project and copies it into `~/.kiln/repository/uk.m4xy/units/1.0.0`, where other
projects on your machine can use it as `library("uk.m4xy:units:1.0.0")`. A library can only depend
on other published libraries, not on project folders, since those might change.

Projects that use your library are checked against its interface, not its code. So every public
function and value in a library has to state its type:

```fckt
module Prices {
  label(pounds: Int): String = "costs ${Money.format(pounds)}"   // not label(pounds: Int) = ...
}
```

## Changing the layout

If your project isn't laid out the way `Fckt` expects, describe it with a module that follows
`FcktConfiguration`, and pass that module to the plugin:

```fckt
import uk.m4xy.kiln.fckt.*

module WithoutStd : FcktConfiguration {
  layout(): FcktLayout = FcktLayout(standardLibrary = false)
}

plugins = [Fckt(WithoutStd)]
```

`FcktLayout` says where the program's `main` file is, which folders hold sources, whether to include
the standard library, which processors to run, and which external packages to link with. A project
whose `external` declarations call libraries installed with opam lists them in `ocamlPackages`, for
example `FcktLayout(ocamlPackages = ["ssl"])`. Projects that depend on it are linked with them
automatically.

### Processors

A processor writes code for your project before it's compiled. A serialization library, for
example, can write a serializer for every type you've annotated. Processors come from libraries,
and you list them in the layout:

```fckt
module Described : FcktConfiguration {
  layout(): FcktLayout = FcktLayout(processors = [
    Processor("uk.m4xy.describe.Describer", [library("uk.m4xy:describe:0.1.0")]),
  ])
}

plugins = [Fckt(Described), FkTests(StandardTests, Described)]
```

The project then has a `process` task, which runs before `compile` and `test`. The generated code
goes in `build/generated` and is compiled with the rest of the project.

## Environment variables

| Variable | What it changes |
| --- | --- |
| `FCKT` | The fckt compiler to use, if it isn't `fckt` on your `PATH` |
| `KILN` | The kiln to use for tasks that run kiln, if it isn't `kiln` on your `PATH` |
| `KILN_HOME` | Where `kiln install` installs to, instead of `~/.kiln` |
| `KILN_REPOSITORY` | The local repository, instead of `~/.kiln/repository` |
| `KILN_CACHE` | Where compiled libraries are kept, instead of `~/.kiln/cache` |

Add `build` and `.kiln` to your version control's ignore list.
