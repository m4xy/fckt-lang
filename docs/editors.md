# Editor support

fckt has a plugin for IntelliJ IDEA and syntax highlighting for VS Code. Both live in the
[fckt repository](https://github.com/m4xy/fckt), under `editors`.

## IntelliJ IDEA

The IntelliJ plugin uses the fckt compiler itself, so it understands your code the way the compiler
does. It:

- colours each name by what it is: types, cases, modules, specs, fields and type parameters each
  get their own colour
- shows the compiler's errors as you type
- goes to where a name is declared, including into the standard library
- finds every use of a declaration
- shows a function's full type, and the effects it uses, when you hover over it
- formats your code with two-space indents

### Install it

You need IntelliJ IDEA 2026.1 or later. From the root of the fckt repository, build the plugin:

```sh
./gradlew :intellij:buildPlugin
```

This writes `editors/intellij/build/distributions/fckt-0.1.0.zip`. In IntelliJ, open
**Settings → Plugins**, click the gear icon, choose **Install Plugin from Disk...**, and pick the
zip.

The build compiles against the IntelliJ IDEA in `~/Applications/IntelliJ IDEA.app`. If yours is
somewhere else, pass its path:

```sh
./gradlew :intellij:buildPlugin -PideaPath="/path/to/IntelliJ IDEA.app"
```

If you added the VS Code grammar to IntelliJ as a TextMate bundle before, remove it under
**Settings → Editor → TextMate Bundles**.

### Colours

The plugin uses your colour scheme's colours for interfaces, classes, type aliases, properties and
so on, so fckt code fits whichever scheme you use. You can change each colour under
**Settings → Editor → Color Scheme → fckt**.

### Projects and libraries

In a kiln project, the plugin finds your packages and libraries the same way kiln does. kiln records
where they are each time it builds, so run `kiln build` once after opening a project. After that,
the editor checks each file as kiln would, and you can go to declarations in your libraries.

### Moving around

- **Go to declaration**: Cmd-click a name, or use **Go To → Declaration**.
- **Find usages**: press Alt-F7 on a declaration. Cmd-Shift-F7 highlights its uses in the current
  file.
- **Types**: hover over a name, or press F1, to see its type. For a function, this includes what it
  does: `does @Console`, `pure`, or `does what f does` for a function whose effects come from a function
  you pass it.

## VS Code

The VS Code extension adds syntax highlighting. Build and install it from `editors/vscode`:

```sh
npm install
npm run package                               # builds fckt-0.1.0.vsix
code --install-extension fckt-0.1.0.vsix
```

If you're changing the grammar, you can link the folder into `~/.vscode/extensions/fckt` instead,
and run **Developer: Reload Window** after each change. `npm run tokens -- sample.fk` prints how
each token in a file is highlighted.

The highlighting is based on patterns, not on the compiler, so it can't tell everything apart. For
that, use the IntelliJ plugin.
