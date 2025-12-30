# Traits: Rust's Interface System for Query Engine Components

You've written this pattern a hundred times in C++:

```cpp
class ColumnVector {
 public:
  virtual ~ColumnVector() = default;
  virtual DataType GetType() const = 0;
  virtual Value GetValue(size_t index) const = 0;
  virtual bool IsNull(size_t index) const = 0;
  virtual size_t size() const = 0;
};
```

An abstract base class. Pure virtual functions. A contract that says "any column must provide these operations."

Rust has the same capability, but the mechanism is different. This tutorial shows you how.

---

## What We're Building

By the end, you'll have:

1. A `Column` trait (like your abstract base class)
2. Concrete column types: `StringColumn`, `Int64Column`, etc.
3. Zero-copy value access with `ValueRef<'a>`
4. Downcasting with `as_any()` (like `dynamic_cast`)
5. Type-safe dispatch with `TypedColumnRef` (like `std::variant`)
6. Macros for visiting columns (like `std::visit`)

---

## Part 1: The Value Types

Your C++ `GetValue` returns by value - which for strings means a copy. In a query engine scanning millions of rows, that's expensive.

Rust lets us do better with two types:

```rust
/// Owned value - owns its data, can live independently
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Int64(i64),
    Float64(f64),
    String(String),
}

/// Borrowed value - zero-copy reference into column storage
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ValueRef<'a> {
    Null,
    Bool(bool),
    Int64(i64),
    Float64(f64),
    String(&'a str),  // Borrows from the column
}
```

The `'a` is a **lifetime** - it says "this reference lives for some duration `'a`."

Convert when you need owned data:

```rust
impl<'a> ValueRef<'a> {
    pub fn to_owned(&self) -> Value {
        match self {
            ValueRef::Null => Value::Null,
            ValueRef::Bool(v) => Value::Bool(*v),
            ValueRef::Int64(v) => Value::Int64(*v),
            ValueRef::Float64(v) => Value::Float64(*v),
            ValueRef::String(v) => Value::String(v.to_string()),  // Clone here
        }
    }
}
```

**Why this matters:** Scan 10 million rows, keep 1000 matches. With `ValueRef`, you only allocate for the 1000 you keep.

---

## Part 2: The Column Trait

```rust
use std::any::Any;

pub trait Column {
    fn data_type(&self) -> &DataType;
    fn get_value(&self, index: usize) -> ValueRef<'_>;
    fn is_null(&self, index: usize) -> bool;
    fn len(&self) -> usize;

    fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// For downcasting - like dynamic_cast in C++
    fn as_any(&self) -> &dyn Any;
}
```

Two things to notice:

1. **`ValueRef<'_>`** - The `'_` means "lifetime tied to `&self`". The compiler ensures you can't use the value after the column is gone.

2. **`as_any()`** - Rust's escape hatch for downcasting. More on this below.

---

## Part 3: Implementing Column Types

### StringColumn

```rust
pub struct StringColumn {
    null_bitmap: Vec<u8>,
    values: Vec<String>,
}

impl StringColumn {
    pub fn from_values(values: Vec<String>) -> Self {
        let bitmap_len = (values.len() + 7) / 8;
        Self {
            null_bitmap: vec![0; bitmap_len],
            values,
        }
    }

    /// Direct access to underlying data (useful after downcasting)
    pub fn values(&self) -> &[String] {
        &self.values
    }
}

impl Column for StringColumn {
    fn data_type(&self) -> &DataType {
        &DataType::String
    }

    fn get_value(&self, index: usize) -> ValueRef<'_> {
        if self.is_null(index) {
            ValueRef::Null
        } else {
            ValueRef::String(&self.values[index])  // Borrow, don't clone
        }
    }

    fn is_null(&self, index: usize) -> bool {
        self.null_bitmap[index / 8] & (1 << (index % 8)) != 0
    }

    fn len(&self) -> usize {
        self.values.len()
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}
```

### Int64Column

```rust
pub struct Int64Column {
    null_bitmap: Vec<u8>,
    values: Vec<i64>,
}

impl Int64Column {
    pub fn from_values(values: Vec<i64>) -> Self {
        let bitmap_len = (values.len() + 7) / 8;
        Self {
            null_bitmap: vec![0; bitmap_len],
            values,
        }
    }

    pub fn values(&self) -> &[i64] {
        &self.values
    }
}

impl Column for Int64Column {
    fn data_type(&self) -> &DataType {
        &DataType::Int64
    }

    fn get_value(&self, index: usize) -> ValueRef<'_> {
        if self.is_null(index) {
            ValueRef::Null
        } else {
            ValueRef::Int64(self.values[index])  // i64 is Copy, so this is cheap
        }
    }

    fn is_null(&self, index: usize) -> bool {
        self.null_bitmap[index / 8] & (1 << (index % 8)) != 0
    }

    fn len(&self) -> usize {
        self.values.len()
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}
```

---

## Part 4: Downcasting with as_any()

In C++, you recover concrete types with `dynamic_cast`:

```cpp
ColumnVector* col = batch.GetColumn(0);
if (auto* int_col = dynamic_cast<Int64Column*>(col)) {
    int64_t sum = std::accumulate(int_col->values().begin(), 
                                   int_col->values().end(), 0LL);
}
```

In Rust, trait objects don't have built-in RTTI. We use the `Any` trait:

```rust
let col: &dyn Column = batch.column(0);

if let Some(int_col) = col.as_any().downcast_ref::<Int64Column>() {
    let sum: i64 = int_col.values().iter().sum();
    println!("Sum: {}", sum);
}
```

**Key difference:** C++ has automatic RTTI in vtables. Rust requires you to explicitly add `as_any()` to your trait.

---

## Part 5: Type-Safe Dispatch with TypedColumnRef

Downcasting one at a time is tedious. In C++17, you might use `std::variant` + `std::visit`:

```cpp
using ColumnRef = std::variant<StringColumn*, Int64Column*, Float64Column*, BoolColumn*>;

std::visit([](auto* col) {
    std::cout << "Length: " << col->size() << "\n";
}, column_ref);
```

In Rust, we create an enum:

```rust
pub enum TypedColumnRef<'a> {
    String(&'a StringColumn),
    Int64(&'a Int64Column),
    Float64(&'a Float64Column),
    Bool(&'a BoolColumn),
}
```

And an extension trait to get it from any `Column`:

```rust
pub trait ColumnExt {
    fn dispatch(&self) -> TypedColumnRef<'_>;
}

impl<T: Column + ?Sized> ColumnExt for T {
    fn dispatch(&self) -> TypedColumnRef<'_> {
        match self.data_type() {
            DataType::String => TypedColumnRef::String(
                self.as_any().downcast_ref::<StringColumn>()
                    .expect("DataType mismatch")
            ),
            DataType::Int64 => TypedColumnRef::Int64(
                self.as_any().downcast_ref::<Int64Column>()
                    .expect("DataType mismatch")
            ),
            DataType::Float64 => TypedColumnRef::Float64(
                self.as_any().downcast_ref::<Float64Column>()
                    .expect("DataType mismatch")
            ),
            DataType::Bool => TypedColumnRef::Bool(
                self.as_any().downcast_ref::<BoolColumn>()
                    .expect("DataType mismatch")
            ),
        }
    }
}
```

Now you can write:

```rust
let col: &dyn Column = batch.column(0);

match col.dispatch() {
    TypedColumnRef::String(s) => println!("Strings: {:?}", s.values()),
    TypedColumnRef::Int64(i) => println!("Sum: {}", i.values().iter().sum::<i64>()),
    TypedColumnRef::Float64(f) => println!("Avg: {:.2}", f.values().iter().sum::<f64>() / f.len() as f64),
    TypedColumnRef::Bool(b) => println!("Any true: {}", b.values().iter().any(|&v| v)),
}
```

---

## Part 6: Dispatch Macros

For convenience, create macros like `std::visit`:

```rust
/// Apply the same operation to any column type
#[macro_export]
macro_rules! dispatch_column {
    ($col:expr, $name:ident => $body:expr) => {
        match $col.dispatch() {
            TypedColumnRef::String($name) => $body,
            TypedColumnRef::Int64($name) => $body,
            TypedColumnRef::Float64($name) => $body,
            TypedColumnRef::Bool($name) => $body,
        }
    };
}
```

Usage:

```rust
// Print length of any column type
dispatch_column!(col, typed => {
    println!("Column has {} rows", typed.len());
});
```

For type-specific logic:

```rust
#[macro_export]
macro_rules! dispatch_column_typed {
    ($col:expr,
     $s:ident : String => $string_body:expr,
     $i:ident : Int64 => $int_body:expr,
     $f:ident : Float64 => $float_body:expr,
     $b:ident : Bool => $bool_body:expr
    ) => {
        match $col.dispatch() {
            TypedColumnRef::String($s) => $string_body,
            TypedColumnRef::Int64($i) => $int_body,
            TypedColumnRef::Float64($f) => $float_body,
            TypedColumnRef::Bool($b) => $bool_body,
        }
    };
}
```

Usage:

```rust
dispatch_column_typed!(col,
    s: String => println!("Total chars: {}", s.values().iter().map(|v| v.len()).sum::<usize>()),
    i: Int64 => println!("Max: {}", i.values().iter().max().unwrap_or(&0)),
    f: Float64 => println!("Min: {:.2}", f.values().iter().cloned().fold(f64::INFINITY, f64::min)),
    b: Bool => println!("True count: {}", b.values().iter().filter(|&&v| v).count())
);
```

---

## Part 7: Static vs Dynamic Dispatch

Rust gives you a choice C++ hides.

### Static Dispatch: `impl Trait`

```rust
fn print_info(col: &impl Column) {
    println!("Type: {:?}, Length: {}", col.data_type(), col.len());
}
```

The compiler generates a **separate copy** for each concrete type. Zero runtime cost. This is like C++ templates.

### Dynamic Dispatch: `dyn Trait`

```rust
pub struct RecordBatch {
    schema: Schema,
    columns: Vec<Box<dyn Column>>,
}
```

The `dyn Column` is a **trait object** - a fat pointer (data + vtable). This is like C++ virtual functions.

### When to Use Which

| Situation | Use | Why |
|-----------|-----|-----|
| Single concrete type at call site | `impl Trait` | Zero overhead |
| Collection of mixed types | `Box<dyn Trait>` | Must be runtime |
| Need concrete type methods | `dispatch()` | Type-safe access |

---

## Part 8: RecordBatch

Putting it together:

```rust
pub struct RecordBatch {
    schema: Schema,
    columns: Vec<Box<dyn Column>>,
}

impl RecordBatch {
    pub fn new(schema: Schema, columns: Vec<Box<dyn Column>>) -> Self {
        Self { schema, columns }
    }

    pub fn column(&self, index: usize) -> &dyn Column {
        self.columns[index].as_ref()
    }

    pub fn num_rows(&self) -> usize {
        self.columns.first().map(|c| c.len()).unwrap_or(0)
    }

    pub fn num_columns(&self) -> usize {
        self.columns.len()
    }

    pub fn schema(&self) -> &Schema {
        &self.schema
    }
}
```

---

## Part 9: The Orphan Rule

This won't compile:

```rust
impl std::fmt::Display for Vec<i32> { /* ... */ }
```

**Orphan rule:** You can only implement a trait if you defined the trait OR you defined the type.

**Why?** Prevents conflicting implementations across crates.

**Workaround - newtype pattern:**

```rust
pub struct MyVec(Vec<i32>);

impl std::fmt::Display for MyVec { /* ... */ }
```

---

## Complete Example

```rust
fn main() {
    // Create columns
    let names = StringColumn::from_values(vec![
        "Alice".to_string(),
        "Bob".to_string(),
        "Carol".to_string(),
    ]);

    let ages = Int64Column::from_values(vec![30, 25, 35]);

    // Create batch
    let schema = Schema::new(vec![
        Field::new("name", DataType::String),
        Field::new("age", DataType::Int64),
    ]);

    let columns: Vec<Box<dyn Column>> = vec![
        Box::new(names),
        Box::new(ages),
    ];

    let batch = RecordBatch::new(schema, columns);

    // Access via trait object (zero-copy)
    for row in 0..batch.num_rows() {
        let name = batch.column(0).get_value(row);
        let age = batch.column(1).get_value(row);
        println!("Row {}: {:?}, {:?}", row, name, age);
    }

    // Type-specific operations via dispatch
    match batch.column(1).dispatch() {
        TypedColumnRef::Int64(ages) => {
            let sum: i64 = ages.values().iter().sum();
            let avg = sum as f64 / ages.len() as f64;
            println!("Average age: {:.1}", avg);
        }
        _ => unreachable!(),
    }

    // Uniform operation via macro
    for i in 0..batch.num_columns() {
        dispatch_column!(batch.column(i), col => {
            println!("Column {} has {} rows", i, col.len());
        });
    }
}
```

---

## Quick Reference

| C++ | Rust |
|-----|------|
| `virtual` methods | `trait` with `dyn Trait` |
| `dynamic_cast<T*>` | `as_any().downcast_ref::<T>()` |
| `std::variant<T1*, T2*>` | `enum TypedColumnRef<'a>` |
| `std::visit` | `match` or `dispatch_column!` macro |
| Template functions | `impl Trait` (static dispatch) |

---

## Summary

1. **Traits are contracts**, not base classes
2. **`ValueRef<'a>`** enables zero-copy access
3. **`as_any()`** provides downcasting (like `dynamic_cast`)
4. **`TypedColumnRef`** gives type-safe dispatch (like `std::variant`)
5. **`dispatch_column!`** provides `std::visit`-like convenience
6. **`impl Trait`** = static dispatch (monomorphization)
7. **`dyn Trait`** = dynamic dispatch (vtable)

