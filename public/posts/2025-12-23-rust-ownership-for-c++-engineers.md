# Rust Ownership for C++ Engineers

You already know memory management. You've written RAII wrappers, used `unique_ptr` and `shared_ptr`, dealt with dangling pointers, and debugged use-after-free bugs at 2am. Rust's ownership system isn't teaching you something new - it's taking concepts you already use *by convention* and making them *compiler-enforced*.

The goal of this tutorial isn't to explain "what ownership is" in the abstract. It's to map your existing C++ mental model to Rust's model, so you can stop fighting the compiler and start leveraging it.

## The Problem Ownership Solves

Consider this C++ code - it compiles fine:

```cpp
std::vector<int>* get_data() {
    std::vector<int> local = {1, 2, 3};
    return &local;  // Dangling pointer - UB
}

void use_after_move() {
    std::unique_ptr<Widget> w = std::make_unique<Widget>();
    process(std::move(w));
    w->doSomething();  // UB - use after move
}
```

Both bugs compile. Both cause undefined behavior. You avoid them through discipline, code review, and sanitizers. Rust's ownership system makes these *compilation errors*. Not warnings. Errors.

This matters for your expression evaluator: parsers juggle lots of temporary strings, AST nodes get passed around, ownership transfers during tree construction. Getting this wrong in C++ means subtle bugs. In Rust, it means the compiler stops you.

## The Mental Model Shift

Here's the key insight: **Rust has the same rules you already follow, but enforced at compile time.**

| C++ Convention | Rust Enforcement |
|----------------|------------------|
| "Don't use after `std::move`" | Compiler error if you try |
| "One owner for `unique_ptr`" | Single owner enforced statically |
| "Don't outlive borrowed data" | Lifetime checking at compile time |
| "Don't mutate while iterating" | Borrow checker prevents it |

Let's walk through each concept.

## Ownership: `unique_ptr` But Everywhere

In C++, you choose your ownership model: raw pointer, `unique_ptr`, `shared_ptr`, or value semantics. In Rust, **everything is owned by default** - like wrapping everything in `unique_ptr`, but without the heap allocation.

```rust
fn main() {
    let s1 = String::from("hello");  // s1 owns the String
    let s2 = s1;                      // Ownership MOVES to s2
    // println!("{}", s1);            // ERROR: s1 is no longer valid
    println!("{}", s2);               // OK: s2 owns it now
}
```

Compare to C++:
```cpp
auto s1 = std::make_unique<std::string>("hello");
auto s2 = std::move(s1);
// s1 is now nullptr - using it is UB, but compiles
std::cout << *s2 << std::endl;
```

The Rust version is the same semantics, but:
1. No explicit `std::move` - assignment of non-Copy types moves by default
2. Using `s1` after the move is a **compile error**, not runtime UB
3. No heap allocation required - `String` owns heap data, but the `String` struct itself is on the stack

### The `Copy` Trait: Value Types

Integers, floats, bools - these implement `Copy`, meaning assignment copies instead of moves:

```rust
let x = 5;
let y = x;  // Copy, not move
println!("{} {}", x, y);  // Both valid
```

This matches C++ value semantics for primitives. Types that are expensive to copy (like `String`, `Vec`, your future `Expr` AST) don't implement `Copy` and move instead.

**Mental model**: If it's cheap to copy (fits in registers, no heap), it's `Copy`. Otherwise, it moves.

## Borrowing: References With Rules

C++ references are aliases with no restrictions. Rust references are *borrows* with strict rules.

```rust
fn calculate_length(s: &String) -> usize {  // Borrows s
    s.len()
}  // Borrow ends here

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s);  // Lend s to function
    println!("{} has length {}", s, len);  // s still valid
}
```

This is like passing a `const&` in C++. The function borrows the data but doesn't own it.

### The Borrowing Rules

Here's where Rust diverges from C++. At any given time, you can have:

1. **One mutable reference** (`&mut T`), OR
2. **Any number of immutable references** (`&T`)

Never both. This prevents data races at compile time.

```rust
let mut s = String::from("hello");

let r1 = &s;      // OK: immutable borrow
let r2 = &s;      // OK: multiple immutable borrows
// let r3 = &mut s; // ERROR: can't mutably borrow while immutably borrowed

println!("{} {}", r1, r2);
// r1 and r2 no longer used after this point

let r3 = &mut s;  // OK: previous borrows are done
r3.push_str(" world");
```

**Why this matters for your parser**: When you're building an AST, you might want to hold a reference to a parent node while modifying a child. The borrow checker forces you to think about this explicitly - often leading to cleaner designs.

### Mutable References: Like Non-Const Refs, But Exclusive

```rust
fn append_world(s: &mut String) {
    s.push_str(" world");
}

fn main() {
    let mut s = String::from("hello");
    append_world(&mut s);
    println!("{}", s);  // "hello world"
}
```

The `&mut` is explicit at both call site and function signature - no surprises about what can be modified.

## Lifetimes: Making Reference Validity Explicit

Lifetimes are where C++ programmers often struggle. But here's the secret: **you already think about lifetimes, you just do it informally**.

When you write C++:
```cpp
std::string_view get_first_word(const std::string& s) {
    // Returns a view into s - caller must ensure s outlives the return value
}
```

You document this in comments or hope the caller understands. Rust makes it explicit:

```rust
fn get_first_word(s: &str) -> &str {
    // Compiler knows: returned reference lives as long as input reference
    s.split_whitespace().next().unwrap_or("")
}
```

The compiler *infers* lifetimes here. But sometimes you need to be explicit:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

Read `'a` as "some lifetime". This says: "the returned reference lives at least as long as both inputs."

**For your parser**: When you have a `Parser` struct that holds a reference to the input string, you'll write:

```rust
struct Parser<'a> {
    input: &'a str,
    position: usize,
}
```

This says: "A `Parser` cannot outlive the string it's parsing." The compiler enforces this - you can't accidentally keep a `Parser` around after the input is freed.

### When Lifetimes Get Complex

Most of the time, lifetime elision rules handle things automatically. You only need explicit lifetimes when:

1. A struct holds a reference
2. A function returns a reference that could come from multiple inputs
3. The compiler can't figure out the relationship

**Pro tip**: If you're fighting lifetime annotations, consider if you actually need a reference, or if owned data (`String` instead of `&str`) would be cleaner. Owned data is often simpler, especially in AST nodes.

## Practical Example: AST Node Ownership

Let's preview how this applies to your expression evaluator. Here's an AST that WON'T work:

```rust
enum Expr {
    Number(i64),
    Add(Expr, Expr),  // ERROR: recursive type has infinite size
}
```

The problem: `Expr` contains `Expr`, so the compiler can't compute the size. In C++, you'd use pointers:

```cpp
struct Expr {
    std::unique_ptr<Expr> left;
    std::unique_ptr<Expr> right;
};
```

Rust's equivalent:

```rust
enum Expr {
    Number(i64),
    Add(Box<Expr>, Box<Expr>),  // Box = heap-allocated owned pointer
}
```

`Box<T>` is Rust's `unique_ptr<T>` - a heap allocation with single ownership. When an `Expr` is dropped, its children are automatically dropped too (RAII, but enforced).

Building an AST:

```rust
// 2 + 3
let expr = Expr::Add(
    Box::new(Expr::Number(2)),
    Box::new(Expr::Number(3)),
);
```

Ownership is clear: the `Add` variant owns both child expressions. No reference counting, no garbage collection, no manual memory management.

## Common Borrow Checker Battles (And Solutions)

### Battle 1: "Cannot move out of borrowed content"

```rust
fn process(v: &Vec<String>) {
    for s in v {  // This iterates by reference
        // do_something(s) where do_something takes String, not &String
    }
}
```

**Fix**: Use `.iter()` explicitly, or clone if you need ownership:
```rust
for s in v.iter() { /* s is &String */ }
for s in v.clone() { /* s is String, but cloned entire vec */ }
```

### Battle 2: "Cannot borrow as mutable because it's also borrowed as immutable"

```rust
let mut v = vec![1, 2, 3];
let first = &v[0];
v.push(4);  // ERROR: v is borrowed immutably
println!("{}", first);
```

**Why**: `push` might reallocate, invalidating `first`. C++ has the same bug, but it compiles. Rust catches it.

**Fix**: Scope your borrows tightly:
```rust
let mut v = vec![1, 2, 3];
let first = v[0];  // Copy the value instead of borrowing
v.push(4);
println!("{}", first);
```

### Battle 3: "Borrowed value does not live long enough"

```rust
fn get_string() -> &str {
    let s = String::from("hello");
    &s  // ERROR: s dropped here, but we're returning reference to it
}
```

**Fix**: Return owned data:
```rust
fn get_string() -> String {
    String::from("hello")
}
```

## Try It Yourself

Create a new Rust project and implement this:

```rust
// 1. Create a struct that owns a String
struct Token {
    text: String,
    position: usize,
}

// 2. Implement a method that borrows self
impl Token {
    fn text(&self) -> &str {
        // Return a reference to the owned String
    }
}

// 3. Create a function that takes ownership
fn consume_token(token: Token) -> String {
    token.text
}

// 4. Try to use a Token after passing it to consume_token - see the error
```

This exercise will make the ownership/borrowing distinction concrete. You'll feel the compiler enforcing the rules.

## Summary

- **Ownership** = `unique_ptr` semantics, but as the default for all types
- **Move** = Default for non-Copy types; using after move is a compile error, not UB
- **Borrowing** = References with rules: one `&mut` XOR many `&`, never both
- **Lifetimes** = Making reference validity explicit; usually inferred, sometimes annotated
- **Box<T>** = Rust's `unique_ptr<T>`, essential for recursive types like AST nodes

**For your expression evaluator**: You'll use `Box<Expr>` for AST children, `&str` for parsing input, and `String` for owned token text. The borrow checker will force you to be explicit about who owns what - which will make your parser more correct and easier to reason about.

Next up: We'll design the actual `Token` and `Expr` enums, using Rust's algebraic data types to make invalid states unrepresentable.
