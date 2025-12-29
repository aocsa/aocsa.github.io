# AST: Building a Recursive Descent Parser in Rust

We've covered ownership and designed our AST types. Now we build the actual machinery: a lexer that turns strings into tokens, and a parser that turns tokens into an AST. This is where Rust's ownership model becomes practical - you'll see how `&str`, iterators, and `Result` work together in real code.

By the end of this tutorial, you'll have a working expression evaluator that parses `"2 + 3 * 4"` into an AST and evaluates it to `14`.

## Architecture Overview

```js
"2 + 3 * 4"  →  Lexer  →  [Number(2), Plus, Number(3), Star, Number(4), Eof]
                              ↓
                           Parser
                              ↓
                     Add(Number(2), Mul(Number(3), Number(4)))
                              ↓
                            eval()
                              ↓
                             14.0
```

Two passes:
1\. ****Lexer****: Characters → Tokens (handles whitespace, multi-digit numbers)
2\. ****Parser****: Tokens → AST (handles precedence, grouping)

This separation is cleaner than parsing characters directly. It's also standard compiler architecture.

## The Complete Types (Recap)

From Tutorial 2, here are our types:

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

#[derive(Debug, Clone)]
pub enum Expr {
    Number(f64),
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    Div(Box<Expr>, Box<Expr>),
    Neg(Box<Expr>),
    Group(Box<Expr>),
}
```

Now let's build the lexer and parser.

## Part 1: The Lexer

The lexer reads characters and produces tokens. Key challenges:
- Skip whitespace
- Parse multi-digit numbers (including decimals)
- Handle single-character operators

### String Slices: `&str`

In C++, you'd probably use `std::string_view` or index into a `std::string`. In Rust, we use `&str` - a reference to a string slice:

```rust
let input = "2 + 3";  // &str (string literal)
let s = String::from("2 + 3");  // String (owned)
let slice: &str = &s;  // Borrow String as &str
```

Key differences from C++:
- `&str` is always valid UTF-8 (no arbitrary byte access)
- You can't index by byte: `input[0]` won't compile
- Instead, iterate over chars: `input.chars()`

### The Chars Iterator

Rust strings expose a `.chars()` method that returns an iterator over Unicode characters:

```rust
for c in "2 + 3".chars() {
    println!("{}", c);  // '2', ' ', '+', ' ', '3'
}
```

But iterators in Rust are **lazy** and **single-pass** - once you consume an element, it's gone. For a lexer, we often need to **peek** at the next character without consuming it.

### Peekable: Look Ahead Without Consuming

The `Peekable` adapter wraps an iterator and adds `.peek()`:

```rust
let mut chars = "123".chars().peekable();
assert_eq!(chars.peek(), Some(&'1'));  // Look without consuming
assert_eq!(chars.next(), Some('1'));   // Now consume
assert_eq!(chars.peek(), Some(&'2'));
```

This is essential for parsing numbers: we keep consuming digits while `.peek()` shows more digits ahead.

### The Lexer Structure

```rust
pub struct Lexer<'a> {
    chars: std::iter::Peekable<std::str::Chars<'a>>,
}
```

Let's unpack this:
- `'a` is a lifetime parameter (from Tutorial 1)
- `Chars<'a>` is the iterator over the input string
- `Peekable<...>` wraps it to add peek functionality
- The lexer borrows the input string - it doesn't own it

In C++ terms: `Lexer` holds a `std::string_view` (conceptually), and the caller must ensure the string outlives the lexer.

### Lexer Implementation

```rust
impl<'a> Lexer<'a> {
    pub fn new(input: &'a str) -> Self {
        Lexer {
            chars: input.chars().peekable(),
        }
    }

    fn skip_whitespace(&mut self) {
        while let Some(&c) = self.chars.peek() {
            if c.is_whitespace() {
                self.chars.next();
            } else {
                break;
            }
        }
    }

    fn read_number(&mut self) -> f64 {
        let mut num_str = String::new();

        // Integer part
        while let Some(&c) = self.chars.peek() {
            if c.is_ascii_digit() {
                num_str.push(c);
                self.chars.next();
            } else {
                break;
            }
        }

        // Decimal part
        if self.chars.peek() == Some(&'.') {
            num_str.push('.');
            self.chars.next();

            while let Some(&c) = self.chars.peek() {
                if c.is_ascii_digit() {
                    num_str.push(c);
                    self.chars.next();
                } else {
                    break;
                }
            }
        }

        num_str.parse().unwrap()  // Safe: we only collected digits and '.'
    }

    pub fn next_token(&mut self) -> Token {
        self.skip_whitespace();

        match self.chars.peek() {
            None => Token::Eof,
            Some(&c) => match c {
                '0'..='9' => Token::Number(self.read_number()),
                '+' => { self.chars.next(); Token::Plus }
                '-' => { self.chars.next(); Token::Minus }
                '*' => { self.chars.next(); Token::Star }
                '/' => { self.chars.next(); Token::Slash }
                '(' => { self.chars.next(); Token::LeftParen }
                ')' => { self.chars.next(); Token::RightParen }
                _ => panic!("Unexpected character: {}", c),
            }
        }
    }
}
```

### Pattern Highlights

1\. ****`while let Some(&c) = self.chars.peek()`****: This pattern combines:
- `while let`: Loop while pattern matches
- `Some(&c)`: Destructure the `Option<&char>`, binding the char itself

2\. ****`'0'..='9'`****: Range pattern for matching digits

3\. ****Consuming vs peeking****: Notice we `.next()` to consume after matching single-char tokens

### Testing the Lexer

```rust
fn main() {
    let mut lexer = Lexer::new("2 + 3.5 * 4");
    loop {
        let token = lexer.next_token();
        println!("{:?}", token);
        if token == Token::Eof {
            break;
        }
    }
}
// Output:
// Number(2.0)
// Plus
// Number(3.5)
// Star
// Number(4.0)
// Eof
```

## Part 2: Error Handling with Result

Before building the parser, we need error handling. Parsing can fail - unmatched parens, unexpected tokens. In C++ you might throw exceptions or return error codes. Rust uses `Result<T, E>`.

### The Result Type

```rust
enum Result<T, E> {
    Ok(T),    // Success, contains value
    Err(E),   // Failure, contains error
}
```

Functions that can fail return `Result`:

```rust
fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err("Division by zero".to_string())
    } else {
        Ok(a / b)
    }
}
```

### The `?` Operator: Early Return on Error

The `?` operator propagates errors automatically:

```rust
fn calculate() -> Result<f64, String> {
    let x = divide(10.0, 2.0)?;  // If Err, return it immediately
    let y = divide(x, 0.0)?;     // This would return Err("Division by zero")
    Ok(y)
}
```

`?` is roughly equivalent to:
```rust
let x = match divide(10.0, 2.0) {
    Ok(val) => val,
    Err(e) => return Err(e),
};
```

This is Rust's answer to exceptions - errors are values, and `?` makes propagation ergonomic.

### Defining a Parse Error

```rust
#[derive(Debug, Clone)]
pub struct ParseError {
    pub message: String,
}

impl ParseError {
    pub fn new(message: impl Into<String>) -> Self {
        ParseError { message: message.into() }
    }
}

// Type alias for convenience
pub type ParseResult<T> = Result<T, ParseError>;
```

## Part 3: The Recursive Descent Parser

### Parser State

The parser consumes tokens from the lexer. It needs to track:
- The lexer (to get more tokens)
- The current token (already read, not yet consumed)

```rust
pub struct Parser<'a> {
    lexer: Lexer<'a>,
    current: Token,
}
```

### Grammar and Precedence

Our expression grammar with proper precedence:

```
expr       → term (('+' | '-') term)*
term       → unary (('*' | '/') unary)*
unary      → '-' unary | primary
primary    → NUMBER | '(' expr ')'
```

This handles:
- `*` and `/` bind tighter than `+` and `-`
- `-` for negation
- Parentheses for grouping

Each grammar rule becomes a method. Lower rules = higher precedence.

### Parser Implementation

```rust
impl<'a> Parser<'a> {
    pub fn new(input: &'a str) -> Self {
        let mut lexer = Lexer::new(input);
        let current = lexer.next_token();
        Parser { lexer, current }
    }

    fn advance(&mut self) -> Token {
        let prev = std::mem::replace(&mut self.current, self.lexer.next_token());
        prev
    }

    fn check(&self, expected: &Token) -> bool {
        // Use discriminant comparison for variants without data
        std::mem::discriminant(&self.current) == std::mem::discriminant(expected)
    }

    fn expect(&mut self, expected: Token) -> ParseResult<()> {
        if self.check(&expected) {
            self.advance();
            Ok(())
        } else {
            Err(ParseError::new(format!(
                "Expected {:?}, got {:?}",
                expected, self.current
            )))
        }
    }

    pub fn parse(&mut self) -> ParseResult<Expr> {
        let expr = self.expression()?;
        if self.current != Token::Eof {
            return Err(ParseError::new(format!(
                "Unexpected token after expression: {:?}",
                self.current
            )));
        }
        Ok(expr)
    }

    // expr → term (('+' | '-') term)*
    fn expression(&mut self) -> ParseResult<Expr> {
        let mut left = self.term()?;

        loop {
            match &self.current {
                Token::Plus => {
                    self.advance();
                    let right = self.term()?;
                    left = Expr::Add(Box::new(left), Box::new(right));
                }
                Token::Minus => {
                    self.advance();
                    let right = self.term()?;
                    left = Expr::Sub(Box::new(left), Box::new(right));
                }
                _ => break,
            }
        }

        Ok(left)
    }

    // term → unary (('*' | '/') unary)*
    fn term(&mut self) -> ParseResult<Expr> {
        let mut left = self.unary()?;

        loop {
            match &self.current {
                Token::Star => {
                    self.advance();
                    let right = self.unary()?;
                    left = Expr::Mul(Box::new(left), Box::new(right));
                }
                Token::Slash => {
                    self.advance();
                    let right = self.unary()?;
                    left = Expr::Div(Box::new(left), Box::new(right));
                }
                _ => break,
            }
        }

        Ok(left)
    }

    // unary → '-' unary | primary
    fn unary(&mut self) -> ParseResult<Expr> {
        if self.check(&Token::Minus) {
            self.advance();
            let inner = self.unary()?;
            Ok(Expr::Neg(Box::new(inner)))
        } else {
            self.primary()
        }
    }

    // primary → NUMBER | '(' expr ')'
    fn primary(&mut self) -> ParseResult<Expr> {
        match &self.current {
            Token::Number(n) => {
                let value = *n;
                self.advance();
                Ok(Expr::Number(value))
            }
            Token::LeftParen => {
                self.advance();
                let inner = self.expression()?;
                self.expect(Token::RightParen)?;
                Ok(Expr::Group(Box::new(inner)))
            }
            _ => Err(ParseError::new(format!(
                "Expected number or '(', got {:?}",
                self.current
            ))),
        }
    }
}
```

### Key Ownership Patterns

1\. ****`std::mem::replace`****: Swaps a value and returns the old one. Used in `advance()` to move `current` out while putting a new token in:
   ```rust
   let prev = std::mem::replace(&mut self.current, self.lexer.next_token());
   ```

2\. ****`&self.current` in match****: We borrow the current token to inspect it, rather than moving it out.

3\. ****`?` propagation****: Every parsing method returns `ParseResult<Expr>`, and `?` propagates errors up.

4\. ****Box::new for recursion****: Each time we build a binary node, we box the children.

### The Advance Pattern

Notice the pattern in `expression()` and `term()`:

```rust
match &self.current {
    Token::Plus => {
        self.advance();  // Consume the token
        let right = self.term()?;  // Parse right operand
        left = Expr::Add(...);
    }
    ...
}
```

We check the current token, then advance past it, then parse what comes next. This is the classic recursive descent pattern.

## Part 4: Putting It All Together

Here's the complete working code:

```rust
// main.rs
mod lexer;
mod parser;
mod ast;

use parser::Parser;

fn main() {
    let inputs = [
        "2 + 3",
        "2 + 3 * 4",
        "10 - 2 - 3",
        "(2 + 3) * 4",
        "-5",
        "--5",
        "2 * -3",
    ];

    for input in inputs {
        let mut parser = Parser::new(input);
        match parser.parse() {
            Ok(expr) => {
                println!("{} = {}", input, expr.eval());
            }
            Err(e) => {
                println!("{} => Error: {}", input, e.message);
            }
        }
    }
}
```

Expected output:
```
2 + 3 = 5
2 + 3 * 4 = 14
10 - 2 - 3 = 5
(2 + 3) * 4 = 20
-5 = -5
--5 = 5
2 * -3 = -6
```

### The `eval` Method (Reminder)

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
}
```

## Common Pitfalls and Fixes

### 1. Left-Recursion Trap

You might be tempted to write:
```rust
// DON'T DO THIS - infinite recursion
fn expression(&mut self) -> ParseResult<Expr> {
    let left = self.expression()?;  // Calls itself with no progress!
    ...
}
```

Recursive descent can't handle left-recursive grammars. The solution: use a loop for left-associative operators (as we did).

### 2. Borrowing Issues with `current`

You might try:
```rust
fn primary(&mut self) -> ParseResult<Expr> {
    if let Token::Number(n) = self.current {
        self.advance();  // ERROR: can't mutate while `n` is borrowed
        Ok(Expr::Number(n))
    }
}
```

Fix: Copy the value before advancing:
```rust
Token::Number(n) => {
    let value = *n;  // Copy the f64
    self.advance();   // Now safe to mutate
    Ok(Expr::Number(value))
}
```

### 3. Operator Associativity

`10 - 2 - 3` should be `(10 - 2) - 3 = 5`, not `10 - (2 - 3) = 11`.

Our loop-based approach gives left-associativity naturally:
```rust
let mut left = self.term()?;
loop {
    match &self.current {
        Token::Minus => {
            self.advance();
            let right = self.term()?;
            left = Expr::Sub(Box::new(left), Box::new(right));
            // `left` is now (previous_left - right)
        }
        ...
    }
}
```

Each iteration builds `(accumulated - next)`, giving left-associativity.

## Project Structure

For a clean organization:

```
expression-evaluator/
├── Cargo.toml
└── src/
    ├── main.rs
    ├── ast.rs       # Expr enum and eval()
    ├── token.rs     # Token enum
    ├── lexer.rs     # Lexer struct
    └── parser.rs    # Parser struct
```

Each module in its own file. Use `mod` and `use` to wire them together.

## Try It Yourself

1\. ****Set up the project****:
   ```bash
   cargo new expression-evaluator
   cd expression-evaluator
   ```

2\. ****Implement the code**** from this tutorial in separate files.

3\. ****Extend the grammar**** - add exponentiation `^` with higher precedence:
   ```
   term   → power (('*' | '/') power)*
   power  → unary ('^' power)?   // Right-associative!
   ```

4\. ****Add better errors**** - include position information in `ParseError`.

5\. ****Add variables**** - extend `Token` with `Identifier(String)`, extend `Expr` with `Var(String)`, and pass an environment to `eval()`.

## Summary

- ****Lexer****: Uses `Peekable<Chars<'a>>` to scan input. The lifetime `'a` ties it to the input string.
- ****Parser****: Holds a `Lexer` and the current `Token`. Uses `std::mem::replace` to advance.
- ****Result<T, E>****: Rust's error handling. The `?` operator propagates errors.
- ****Recursive Descent****: Each grammar rule is a method. Lower in the grammar = higher precedence.
- ****Left-associativity****: Use loops instead of direct left-recursion.

****You now have a complete expression evaluator in Rust.**** The patterns here - iterators with `Peekable`, `Result` with `?`, ownership-aware state management - are the foundation of production Rust code.

Your next steps toward DataFusion contribution:
- Add more expression types (comparisons, booleans, function calls)
- Implement a simple type system
- Look at how DataFusion's `Expr` enum represents SQL expressions
- Study DataFusion's `LogicalPlan` to see how query plans are represented as ASTs

