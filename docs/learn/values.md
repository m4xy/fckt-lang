# Values

A value has a name and never changes. Write the name, `=`, and what it is:

```fckt
language = "fckt"
year = 2026
```

To put a value inside a string, write `$` before its name. For anything longer than a name, wrap
it in `${...}`:

```fckt
"Hello, $language"              // Hello, fckt
"${language.length} letters"    // 4 letters
```

## Your task

Make `greeting` say `Hello, fckt!`, using `language` rather than writing `fckt` again. Then make
`letters` the number of characters in `language`.

```fckt lesson-starter
language = "fckt"

greeting = "Hello!"
letters = 0
```

```fckt lesson-solution
language = "fckt"

greeting = "Hello, $language!"
letters = language.length
```

```fckt lesson-check
main() = {
  expect(greeting == "Hello, fckt!", "greeting is '$greeting', but it should be 'Hello, fckt!'")
  expect(letters == 4, "letters is $letters, but fckt has 4 letters")
}
```

```text lesson-hint
A template puts a value into a string: "Hello, $language".
```

```text lesson-hint
A string's length is language.length.
```
