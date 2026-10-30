// The programs the playground offers to start from. Each is a whole program with a main.
export const examples: { name: string; code: string }[] = [
  {
    name: 'Hello',
    code: `import fckt.io.Console

greeting(name: String) = "Hello, $name"

main() = {
  println(greeting("fckt"))
  println("\${[1, 2, 3].map { it * 10 }}")
}
`,
  },
  {
    name: 'Derivatives',
    code: `import fckt.io.Console

derivative(
  f: (Float) -> Float,
  h: Float = 0.000001,
): (Float) -> Float =
  x -> (f(x + h) - f(x)) / h

square(x: Float) = x * x
cube(x: Float) = x * x * x

main() = {
  println("\${derivative(square)(3.0)}")
  println("\${derivative(cube)(2.0)}")
  println("\${derivative(derivative(cube))(2.0)}")
}
`,
  },
  {
    name: 'Shapes',
    code: `import fckt.io.Console

type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
  Square(side: Float)
}

area(shape: Shape): Float = when (shape) {
  is Circle -> 3.14159 * shape.radius * shape.radius
  is Rectangle -> shape.width * shape.height
  is Square -> shape.side * shape.side
}

main() = {
  shapes = [Circle(1.0), Rectangle(2.0, 3.0), Square(2.0)]
  shapes.forEach { println("$it has area \${area(it)}") }
}
`,
  },
  {
    name: 'Effects and handlers',
    code: `import fckt.io.Console

effect Clock { now(): Int }

@Clock @Console stamped(message: String) = println("[\${now()}] $message")

main() = {
  // The same function, run with two different clocks.
  Clock(now = ~42) { stamped("ready") }
  Clock(now = ~1700000000) { stamped("ready") }
}
`,
  },
  {
    name: 'Failing',
    code: `import fckt.io.Console
import fckt.effects.Fail
import fckt.effects.Failure.*

@Fail half(n: Int): Int = if (n % 2 == 0) n / 2 else fail("$n is odd")

main() = {
  println("\${attempt { half(10) }}")
  println("\${attempt { half(7) }}")
}
`,
  },
  {
    name: 'Generators',
    code: `import fckt.io.Console
import fckt.effects.Generators.*
import fckt.effects.Yielding
import fckt.collections.Streams.*

@Yielding<Int> fibonacci(a: Int, b: Int): Unit = {
  yield(a)
  fibonacci(b, a + b)
}

main() = println("\${sequence { fibonacci(0, 1) }.take(10)}")
`,
  },
]
