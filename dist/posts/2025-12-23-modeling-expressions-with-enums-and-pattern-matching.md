# AST: Modeling Expressions with Enums and Pattern Matching in Rust

In C++, you'd model an AST with a class hierarchy: a base `Expr` class, derived classes like `BinaryExpr` and `LiteralExpr`, virtual methods for evaluation and pretty-printing. You'd probably implement a visitor pattern to add operations without modifying the hierarchy.

Rust takes a fundamentally different approach: **algebraic data types** (enums with data) plus **pattern matching**. This approach has a superpower that C++ class hierarchies lack: the compiler guarantees you handle every case. Forget a variant? Compilation error. Add a new variant later? The compiler shows you every place that needs updating.

For your expression evaluator, this means: impossible to forget to handle a case, and easy to evolve the AST as requirements change.

## The Problem with C++ Hierarchies

Consider a typical C++ AST:

```cpp
class Expr {
public:
    virtual ~Expr() = default;
    virtual double eval() const = 0;
    virtual std::string to_string() const = 0;
};

class NumberExpr : public Expr {
    double value;
public:
    double eval() const override { return value; }
    std::string to_string() const override { return std::to_string(value); }
};

class BinaryExpr : public Expr {
    std::unique_ptr<Expr> left, right;
    char op;
public:
    double eval() const override { /* dispatch on op */ }
    std::string to_string() const override { /* ... */ }
};
```

Problems:
1. **Adding operations is painful**: Want to add `optimize()`? Modify every class or implement a visitor.
2. **No exhaustiveness checking**: If you add `UnaryExpr` later, nothing forces you to update all visitors.
3. **Heap allocation everywhere**: Every node is a `unique_ptr<Expr>`.
4. **Type information lost**: You have an `Expr*` but don't know which concrete type without `dynamic_cast`.

## Rust's Approach: Enums With Data

Rust enums aren't like C++ enums (which are just integers). They're **tagged unions** that can hold different data for each variant:

```rust
enum Expr {
    Number(f64),
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    Div(Box<Expr>, Box<Expr>),
    Neg(Box<Expr>),
}
```

Each variant is a distinct type. `Expr::Number` holds an `f64`. `Expr::Add` holds two boxed child expressions. The `Box` is necessary for recursion (as we covered in Tutorial 1).

Compare to C++: this is like a `std::variant<Number, Add, Sub, Mul, Div, Neg>`, but with nicer syntax and exhaustive pattern matching.

### Why `Box`?

Without `Box`, the compiler can't determine the size of `Expr`:

```rust
// Won't compile: recursive type has infinite size
enum Expr {
    Number(f64),
    Add(Expr, Expr),  // How big is this? Depends on Expr, which depends on...
}
```

`Box<Expr>` is a pointer (fixed size: 8 bytes on 64-bit), so:

```rust
enum Expr {
    Number(f64),           // 8 bytes for the f64
    Add(Box<Expr>, Box<Expr>),  // 16 bytes (two pointers)
}
// Total size: max variant + tag = ~24 bytes
```

The tradeoff: heap allocation for tree structure, but clear ownership semantics.

## Pattern Matching: The Exhaustive Switch

Here's where Rust shines. To evaluate an expression:

```rust
fn eval(expr: &Expr) -> f64 {
    match expr {
        Expr::Number(n) => *n,
        Expr::Add(left, right) => eval(left) + eval(right),
        Expr::Sub(left, right) => eval(left) - eval(right),
        Expr::Mul(left, right) => eval(left) * eval(right),
        Expr::Div(left, right) => eval(left) / eval(right),
        Expr::Neg(inner) => -eval(inner),
    }
}
```

**Key insight**: If you forget a variant, this won't compile. If you add `Expr::Pow` later, the compiler shows you every `match` that needs updating.

Compare to C++ visitor patterns or switch statements - they silently do nothing (or crash) on unhandled cases.

### Binding Variables in Patterns

Notice how we extract data in the pattern itself:

```rust
Expr::Add(left, right) => eval(left) + eval(right)
```

`left` and `right` are bound to the `Box<Expr>` values inside the `Add` variant. No casting, no `.get()` methods - the pattern match gives you typed access.

### The Wildcard and Catch-All

Sometimes you don't care about all cases:

```rust
fn is_literal(expr: &Expr) -> bool {
    match expr {
        Expr::Number(_) => true,  // _ ignores the value
        _ => false,               // catch-all for everything else
    }
}
```

But be careful: catch-all patterns defeat exhaustiveness checking. If you add a new literal type (like `Expr::Bool`), this function silently returns `false` for it.

**Best practice**: Use explicit variants when possible, catch-all only when you truly mean "everything else".

## Designing the Token Type

Before we parse expressions, we need to lex them into tokens. Here's a token type:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    Number(f64),
    Plus,
    Minus,
    Star,
    Slash,
    LeftParen,
    RightParen,
    Eof,
}
```

The `#[derive(...)]` attribute auto-generates useful traits:
- `Debug`: Can print with `{:?}` for debugging
- `Clone`: Can copy tokens (they're small)
- `PartialEq`: Can compare tokens with `==`

### Tokens vs AST Nodes

Notice the difference:
- **Tokens**: Flat, represent lexical units. `Plus` is just `Plus`, no children.
- **Expr**: Recursive, represents structure. `Add` contains two sub-expressions.

This is standard compiler architecture: lexer produces tokens, parser consumes tokens and produces AST.

## Building the Complete Expression AST

Let's design a complete `Expr` type for arithmetic expressions with operator precedence:

```rust
#[derive(Debug, Clone)]
pub enum Expr {
    // Leaf nodes
    Number(f64),

    // Binary operations
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    Div(Box<Expr>, Box<Expr>),

    // Unary operations
    Neg(Box<Expr>),

    // Grouping (for pretty-printing, tracks parens)
    Group(Box<Expr>),
}
```

### Constructor Functions

Writing `Box::new(Expr::Number(5.0))` everywhere is tedious. Idiomatic Rust uses constructor functions:

```rust
impl Expr {
    pub fn number(n: f64) -> Self {
        Expr::Number(n)
    }

    pub fn add(left: Expr, right: Expr) -> Self {
        Expr::Add(Box::new(left), Box::new(right))
    }

    pub fn sub(left: Expr, right: Expr) -> Self {
        Expr::Sub(Box::new(left), Box::new(right))
    }

    pub fn mul(left: Expr, right: Expr) -> Self {
        Expr::Mul(Box::new(left), Box::new(right))
    }

    pub fn div(left: Expr, right: Expr) -> Self {
        Expr::Div(Box::new(left), Box::new(right))
    }

    pub fn neg(inner: Expr) -> Self {
        Expr::Neg(Box::new(inner))
    }

    pub fn group(inner: Expr) -> Self {
        Expr::Group(Box::new(inner))
    }
}
```

Now building ASTs is clean:

```rust
// 2 + 3 * 4
let ast = Expr::add(
    Expr::number(2.0),
    Expr::mul(Expr::number(3.0), Expr::number(4.0))
);
```

## Pattern Matching Deep Dive

### Nested Patterns

You can match nested structure:

```rust
fn simplify(expr: Expr) -> Expr {
    match expr {
        // 0 + x => x
        Expr::Add(left, right) if matches!(*left, Expr::Number(n) if n == 0.0) => *right,

        // x + 0 => x
        Expr::Add(left, right) if matches!(*right, Expr::Number(n) if n == 0.0) => *left,

        // x * 1 => x
        Expr::Mul(left, right) if matches!(*right, Expr::Number(n) if n == 1.0) => *left,

        // 1 * x => x
        Expr::Mul(left, right) if matches!(*left, Expr::Number(n) if n == 1.0) => *right,

        // No simplification
        other => other,
    }
}
```

### Match Guards

The `if` after a pattern is a **guard** - extra conditions that must be true:

```rust
fn describe(expr: &Expr) -> &str {
    match expr {
        Expr::Number(n) if *n == 0.0 => "zero",
        Expr::Number(n) if *n < 0.0 => "negative number",
        Expr::Number(_) => "positive number",
        Expr::Add(_, _) => "addition",
        _ => "other expression",
    }
}
```

### Destructuring References

When matching on `&Expr`, you get references to the inner data:

```rust
fn eval(expr: &Expr) -> f64 {
    match expr {
        Expr::Number(n) => *n,  // n is &f64, dereference to get f64
        Expr::Add(left, right) => eval(left) + eval(right),  // left is &Box<Expr>
        // ...
    }
}
```

When matching on owned `Expr`, you get owned inner data:

```rust
fn into_number(expr: Expr) -> Option<f64> {
    match expr {
        Expr::Number(n) => Some(n),  // n is f64, moved out
        _ => None,
    }
}
```

### The `if let` and `let else` Shortcuts

When you only care about one variant:

```rust
// Instead of:
match expr {
    Expr::Number(n) => println!("Got number: {}", n),
    _ => {}
}

// Use if let:
if let Expr::Number(n) = expr {
    println!("Got number: {}", n);
}

// Or let else for early returns:
fn must_be_number(expr: Expr) -> f64 {
    let Expr::Number(n) = expr else {
        panic!("Expected a number");
    };
    n
}
```

## Implementing Operations

Let's implement evaluation and pretty-printing:

```rust
impl Expr {
    pub fn eval(&self) -> f64 {
        match self {
            Expr::Number(n) => *n,
            Expr::Add(l, r) => l.eval() + r.eval(),
            Expr::Sub(l, r) => l.eval() - r.eval(),
            Expr::Mul(l, r) => l.eval() * r.eval(),
            Expr::Div(l, r) => l.eval() / r.eval(),
            Expr::Neg(inner) => -inner.eval(),
            Expr::Group(inner) => inner.eval(),
        }
    }

    pub fn to_string(&self) -> String {
        match self {
            Expr::Number(n) => format!("{}", n),
            Expr::Add(l, r) => format!("({} + {})", l.to_string(), r.to_string()),
            Expr::Sub(l, r) => format!("({} - {})", l.to_string(), r.to_string()),
            Expr::Mul(l, r) => format!("({} * {})", l.to_string(), r.to_string()),
            Expr::Div(l, r) => format!("({} / {})", l.to_string(), r.to_string()),
            Expr::Neg(inner) => format!("(-{})", inner.to_string()),
            Expr::Group(inner) => format!("({})", inner.to_string()),
        }
    }
}
```

Notice: no inheritance, no virtual dispatch, no visitor pattern. Just data and functions. Adding a new operation is just adding a new method.

## Comparison: Rust Enums vs C++ Approaches

| Feature | C++ Class Hierarchy | C++ `std::variant` | Rust Enum |
|---------|---------------------|---------------------|-----------|
| Exhaustiveness | No | Yes (with `std::visit`) | Yes |
| Adding variants | Easy | Recompile all users | Recompile all users |
| Adding operations | Hard (modify classes) | Easy (new visitor) | Easy (new function) |
| Syntax | Verbose | Very verbose | Clean |
| Memory | Heap + vtable | Stack (sum of sizes) | Stack (max + tag) |

Rust enums hit a sweet spot: clean syntax, exhaustive checking, and efficient memory layout.

## Try It Yourself

Create a Rust project and implement these types:

```rust
// 1. Define Token enum with: Number(f64), Plus, Minus, Star, Slash, LParen, RParen, Eof
pub enum Token {
    // Fill in variants
}

// 2. Define Expr enum with: Number(f64), Add, Sub, Mul, Div, Neg
pub enum Expr {
    // Fill in variants (remember Box for recursion)
}

// 3. Implement eval() for Expr
impl Expr {
    pub fn eval(&self) -> f64 {
        // Use match
    }
}

// 4. Test with: 2 + 3 * 4 = 14
fn main() {
    let expr = Expr::add(
        Expr::number(2.0),
        Expr::mul(Expr::number(3.0), Expr::number(4.0))
    );
    println!("{} = {}", expr.to_string(), expr.eval());
}
```

Try adding a `Pow` variant for exponentiation. Notice how the compiler guides you to every place that needs updating.

## Summary

- **Rust enums are algebraic data types**: Each variant can hold different data, like a tagged union with nice syntax
- **Pattern matching is exhaustive**: Forget a variant? Compiler error. This catches bugs at compile time.
- **`Box<T>` enables recursion**: Required for tree structures like ASTs
- **No inheritance needed**: Operations are just functions that match on variants
- **Constructor functions**: Use `impl` to create clean builders like `Expr::add(left, right)`

**For your expression evaluator**: You now have the `Token` and `Expr` types. The lexer will produce `Token`s, the parser will consume them and produce an `Expr` AST, and evaluation is just pattern matching over the tree.

Next up: Building the actual parser - lexing strings into tokens, then parsing tokens into your AST with proper operator precedence.
