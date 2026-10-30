# Mutation

Values don't change unless you say they can. Mark a field `var`, and it can be changed with `=`,
`+=` and the like:

```fckt
type Account(owner: String, var balance: Int)
```

A function that changes something its caller can see says `@Mutating`, so anyone reading its type
knows the value it's given might not be the same afterwards:

```fckt
@Mutating deposit(account: Account, amount: Int) = {
  account.balance += amount
}
```

## Your task

Write `withdraw`. It takes the money and gives back `true` when the account has enough, and leaves
the account alone and gives back `false` when it doesn't.

```fckt lesson-starter
type Account(owner: String, var balance: Int)

@Mutating withdraw(account: Account, amount: Int): Boolean = false
```

```fckt lesson-solution
type Account(owner: String, var balance: Int)

@Mutating withdraw(account: Account, amount: Int): Boolean =
  if (amount > account.balance) false else {
    account.balance -= amount
    true
  }
```

```fckt lesson-check
main() = {
  account = Account("Ada", 100)
  first = withdraw(account, 30)
  expect(first, "withdrawing 30 from 100 gave false")
  expect(account.balance == 70, "after withdrawing 30 from 100, the balance is ${account.balance}")
  second = withdraw(account, 500)
  expect(!second, "withdrawing 500 from 70 gave true")
  expect(account.balance == 70, "after a withdrawal that's too big, the balance is ${account.balance}, but it should still be 70")
}
```

```text lesson-hint
Check first: if (amount > account.balance) false else { ... }.
```

```text lesson-hint
Inside the else block, account.balance -= amount, then true as its last line.
```
