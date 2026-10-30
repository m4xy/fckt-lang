# Records

A record groups named values. Declare one with `type`, listing its fields, then build one by
calling its name:

```fckt
type Book(title: String, author: String, pages: Int)

book = Book("Middlemarch", "George Eliot", 880)
book.pages                      // 880
```

A record never changes. To get one with a field different, `copy` it and name the fields to
change. The original stays as it was:

```fckt
book.copy(pages = 900)          // Book(title=Middlemarch, author=George Eliot, pages=900)
```

## Your task

Write `isLong`, which says whether a book has more than 300 pages. Then write `secondEdition`,
which gives the same book with ` (2nd edition)` added to the end of its title.

```fckt lesson-starter
type Book(title: String, author: String, pages: Int)

isLong(book: Book): Boolean = false

secondEdition(book: Book): Book = book
```

```fckt lesson-solution
type Book(title: String, author: String, pages: Int)

isLong(book: Book): Boolean = book.pages > 300

secondEdition(book: Book): Book = book.copy(title = "${book.title} (2nd edition)")
```

```fckt lesson-check
main() = {
  long = Book("Middlemarch", "George Eliot", 880)
  short = Book("The Metamorphosis", "Franz Kafka", 70)
  expect(isLong(long), "isLong says ${long.title}, at ${long.pages} pages, isn't long")
  expect(!isLong(short), "isLong says ${short.title}, at ${short.pages} pages, is long")
  second = secondEdition(short)
  expect(second.title == "The Metamorphosis (2nd edition)", "secondEdition gave the title '${second.title}'")
  expect(second.author == short.author && second.pages == short.pages, "secondEdition changed more than the title: $second")
}
```

```text lesson-hint
A field is read with a dot: book.pages > 300.
```

```text lesson-hint
copy changes only the fields you name: book.copy(title = "${book.title} (2nd edition)").
```
