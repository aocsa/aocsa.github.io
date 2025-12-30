# Generics and Trait Bounds: Type-Safe Column Design

In the Traits tutorial, you built concrete column types (`StringColumn`, `Int64Column`, etc.) and learned how to work with them through trait objects and type dispatch.

Now we'll explore **generics** - Rust's system for writing code that works with multiple types. You'll learn when to use generics vs concrete types, and how Rust's trait bounds give you compile-time safety that C++ templates lack.

---

## What We're Building

By the end, you'll understand:

1. **Trait bounds** - Rust's explicit constraints (like C++20 concepts, but mandatory)
2. **When to use concrete types vs generics** - The design tradeoffs
3. **The `where` clause** - Readable complex bounds
4. **Associated types vs generic parameters** - Who chooses the type?
5. **Conditional implementations** - Methods only for certain types
6. **`PhantomData`** - Type markers without storage
7. **Ergonomic APIs** - Using `impl Into<String>`

---

## Part 1: The Fundamental Difference - Explicit Constraints

Your C++ `TypedColumnVector<T>` uses templates:

```cpp
template <typename T>
class TypedColumnVector : public ColumnVector {
  void Append(T value) { /* ... */ }
  T GetTypedValue(size_t index) const { /* ... */ }
};
```

C++ templates are **duck-typed**. You can write:

```cpp
template<typename T>
T add(T a, T b) {
    return a + b;  // Assumes T has operator+
}
```

Call `add(1, 2)` - works. Call `add(MyType{}, MyType{})` - compiler error, but only at **instantiation time**, with a wall of template error messages.

Rust requires you to declare constraints **upfront**:

```rust
fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}
```

The `T: std::ops::Add<Output = T>` is a **trait bound**. It says: "T must implement `Add`, and adding two T's must produce a T."

Call `add` with a type that doesn't implement `Add`? Error **at the call site**, with a clear message:

```
error[E0277]: the trait `Add` is not implemented for `MyType`
```

This is like C++20 concepts, but mandatory from day one.

---

## Part 2: Generic vs Concrete - The Design Decision

You might expect we'd build `TypedColumn<T>` in Rust. But in the Traits tutorial, we used concrete types:

```rust
pub struct StringColumn { /* ... */ }
pub struct Int64Column { /* ... */ }
pub struct Float64Column { /* ... */ }
pub struct BoolColumn { /* ... */ }
```

Why not generics?

### When Concrete Types Win

1. **Different logic per type.** String columns get dictionary encoding. Numeric columns get SIMD. Bool columns pack bits. One generic fights these specializations.

2. **Clearer errors.** `StringColumn::get_value` vs `TypedColumn<std::string::String>::get_value`.

3. **Fixed type set.** Query engines have finite types: ints, floats, strings, timestamps. You're not building an extensible library.

### When Generics Win

- **Type-safe builders:** `ColumnBuilder<i64>` ensures you only append `i64`s
- **Algorithms:** `fn sum<C: NumericColumn>(col: &C) -> f64`
- **Library APIs:** Arrow uses generics for extensibility

**DataFusion's approach:** Concrete types for storage, generics for operations.

---

## Part 3: Lifetime Parameters - Generics Over Lifetimes

You've already seen generics over lifetimes. Your `ValueRef<'a>` from the Traits tutorial:

```rust
impl<'a> ValueRef<'a> {
    pub fn to_owned(&self) -> Value {
        match self {
            ValueRef::String(s) => Value::String(s.to_string()),
            // ...
        }
    }
}
```

The `<'a>` is a **lifetime parameter** - a generic over lifetimes, not types.

Read `impl<'a> ValueRef<'a>` as: "For any lifetime `'a`, implement these methods on `ValueRef<'a>`."

---

## Part 4: The Where Clause

When bounds get complex, inline syntax becomes unreadable:

```rust
// Hard to read
fn process<T: Clone + Debug + PartialEq + Default>(items: &[T]) { /* ... */ }
```

Use `where` instead:

```rust
// Clear
fn process<T>(items: &[T])
where
    T: Clone + Debug + PartialEq + Default,
{
    // ...
}
```

Essential with multiple type parameters:

```rust
fn merge<T, U>(left: Vec<T>, right: Vec<U>) -> Vec<(T, U)>
where
    T: Clone + Ord,
    U: Clone,
    T: PartialEq<U>,  // T must be comparable to U
{
    // ...
}
```

---

## Part 5: Associated Types vs Generic Parameters

In the Traits tutorial, we briefly mentioned `DataSource` with an associated type. Now let's understand **when to use which**.

### The Problem

Your `DataSource` trait needs to return an iterator. Two ways to express this:

**Option A: Generic parameter**
```rust
pub trait DataSource<I: Iterator<Item = RecordBatch>> {
    fn schema(&self) -> &Schema;
    fn scan(&self) -> I;
}
```

**Option B: Associated type**
```rust
pub trait DataSource {
    type Iterator: Iterator<Item = RecordBatch>;
    
    fn schema(&self) -> &Schema;
    fn scan(&self) -> Self::Iterator;
}
```

### The Key Difference

**Generic parameters:** The **caller** chooses the type. One type can have multiple implementations.

```rust
// With generic parameter - multiple implementations possible!
impl DataSource<VecIterator> for CsvDataSource { /* ... */ }
impl DataSource<StreamIterator> for CsvDataSource { /* ... */ }  // Also valid
```

**Associated types:** The **implementer** chooses the type. One implementation per type.

```rust
// With associated type - ONE implementation
impl DataSource for CsvDataSource {
    type Iterator = CsvRecordBatchIterator;  // Fixed choice
    
    fn scan(&self) -> Self::Iterator {
        CsvRecordBatchIterator::new(/* ... */)
    }
}
```

### Rule of Thumb

| Pattern | Who Chooses | Use When |
|---------|-------------|----------|
| Generic parameter | Caller | `fn parse<T: FromStr>(s: &str) -> T` - caller picks return type |
| Associated type | Implementer | `trait Iterator { type Item }` - one natural choice per impl |

### Your DataSource

Associated type is right here - each data source has **one** natural iterator type:

```rust
impl DataSource for CsvDataSource {
    type Iterator = CsvRecordBatchIterator;
    // ...
}

impl DataSource for ParquetDataSource {
    type Iterator = ParquetRecordBatchIterator;
    // ...
}
```

---

## Part 6: Conditional Implementations

Want methods only for certain column types? Create a trait and implement it selectively:

```rust
pub trait NumericColumn: Column {
    fn sum(&self) -> f64;
    fn mean(&self) -> f64 {
        self.sum() / self.len() as f64
    }
}

impl NumericColumn for Int64Column {
    fn sum(&self) -> f64 {
        self.values()
            .iter()
            .enumerate()
            .filter(|(i, _)| !self.is_null(*i))
            .map(|(_, v)| *v as f64)
            .sum()
    }
}

impl NumericColumn for Float64Column {
    fn sum(&self) -> f64 {
        self.values()
            .iter()
            .enumerate()
            .filter(|(i, _)| !self.is_null(*i))
            .copied()
            .sum()
    }
}

// StringColumn and BoolColumn don't implement NumericColumn
```

Now:

```rust
int64_col.sum()    // ✓ Compiles
float64_col.sum()  // ✓ Compiles
string_col.sum()   // ✗ Error: method not found
```

Write generic functions over numeric columns:

```rust
fn aggregate_sum<C: NumericColumn>(col: &C) -> f64 {
    col.sum()
}
```

---

## Part 7: Derive Macros

You've seen `#[derive(...)]` on your types:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum DataType {
    Bool,
    Int64,
    Float64,
    String,
}
```

These auto-generate trait implementations. Common derivable traits:

| Trait | What It Does | C++ Equivalent |
|-------|--------------|----------------|
| `Debug` | Format with `{:?}` | `operator<<` for debugging |
| `Clone` | Deep copy via `.clone()` | Copy constructor |
| `Copy` | Implicit bitwise copy | Trivially copyable |
| `PartialEq` | `==` and `!=` | `operator==` |
| `Eq` | Marker: equality is reflexive | (no equivalent) |
| `Default` | `T::default()` | Default constructor |
| `Hash` | Use in `HashMap`/`HashSet` | `std::hash` specialization |

**Note:** `Copy` requires all fields to be `Copy`. Strings aren't `Copy`, so `StringColumn` can only be `Clone`.

---

## Part 8: PhantomData - Type Markers

Sometimes you need a type parameter that isn't stored. Consider a type-safe builder:

```rust
pub struct ColumnBuilder<T> {
    values: Vec<String>,  // Store everything as strings during CSV parsing
    // But T isn't used anywhere!
}
```

Compiler error: "parameter `T` is never used."

Fix with `PhantomData`:

```rust
use std::marker::PhantomData;

pub struct ColumnBuilder<T> {
    values: Vec<String>,
    _phantom: PhantomData<T>,  // Zero-sized marker
}

impl<T> ColumnBuilder<T> {
    pub fn new() -> Self {
        Self {
            values: Vec::new(),
            _phantom: PhantomData,
        }
    }
    
    pub fn push(&mut self, value: String) {
        self.values.push(value);
    }
}
```

Now add type-specific `build` methods:

```rust
impl ColumnBuilder<i64> {
    pub fn build(self) -> Int64Column {
        let parsed: Vec<i64> = self.values
            .iter()
            .map(|s| s.parse().unwrap_or(0))
            .collect();
        Int64Column::from_values(parsed)
    }
}

impl ColumnBuilder<String> {
    pub fn build(self) -> StringColumn {
        StringColumn::from_values(self.values)
    }
}
```

Usage:

```rust
let mut builder: ColumnBuilder<i64> = ColumnBuilder::new();
builder.push("42".to_string());
builder.push("123".to_string());
let column: Int64Column = builder.build();  // Type-safe!
```

`PhantomData<T>` is **zero-sized** - no runtime cost. It tells the compiler "this struct logically relates to `T`."

---

## Part 9: Ergonomic APIs with impl Trait

Your `Field::new` accepts both `&str` and `String`:

```rust
impl Field {
    pub fn new(name: impl Into<String>, data_type: DataType) -> Self {
        Self {
            name: name.into(),
            data_type,
        }
    }
}
```

The `impl Into<String>` is shorthand for:

```rust
pub fn new<S: Into<String>>(name: S, data_type: DataType) -> Self
```

Now both work:

```rust
Field::new("name", DataType::String)           // &str
Field::new(my_string, DataType::String)        // String
Field::new(my_cow.into_owned(), DataType::String)  // Cow<str>
```

The compiler monomorphizes - generates specialized code for each type. Zero runtime cost.

**Common patterns:**

```rust
fn process(path: impl AsRef<Path>) { /* ... */ }  // Accept &str, String, PathBuf, &Path
fn log(msg: impl Display) { /* ... */ }           // Accept anything printable
fn read(reader: impl Read) { /* ... */ }          // Accept File, &[u8], Cursor, etc.
```

---

## Complete Example: Type-Safe Column Builder

```rust
use std::marker::PhantomData;

pub struct ColumnBuilder<T> {
    values: Vec<String>,
    nulls: Vec<bool>,
    _phantom: PhantomData<T>,
}

impl<T> ColumnBuilder<T> {
    pub fn new() -> Self {
        Self {
            values: Vec::new(),
            nulls: Vec::new(),
            _phantom: PhantomData,
        }
    }
    
    pub fn push(&mut self, value: impl Into<String>) {
        self.values.push(value.into());
        self.nulls.push(false);
    }
    
    pub fn push_null(&mut self) {
        self.values.push(String::new());
        self.nulls.push(true);
    }
    
    pub fn len(&self) -> usize {
        self.values.len()
    }
}

impl ColumnBuilder<i64> {
    pub fn build(self) -> Int64Column {
        let values: Vec<i64> = self.values
            .iter()
            .zip(&self.nulls)
            .map(|(s, &is_null)| {
                if is_null { 0 } else { s.parse().unwrap_or(0) }
            })
            .collect();
        
        let mut col = Int64Column::from_values(values);
        for (i, &is_null) in self.nulls.iter().enumerate() {
            if is_null {
                col.set_null(i);
            }
        }
        col
    }
}

impl ColumnBuilder<String> {
    pub fn build(self) -> StringColumn {
        let mut col = StringColumn::from_values(self.values);
        for (i, &is_null) in self.nulls.iter().enumerate() {
            if is_null {
                col.set_null(i);
            }
        }
        col
    }
}

// Usage
fn main() {
    let mut int_builder: ColumnBuilder<i64> = ColumnBuilder::new();
    int_builder.push("42");
    int_builder.push("100");
    int_builder.push_null();
    
    let int_col = int_builder.build();  // Returns Int64Column
    
    let mut str_builder: ColumnBuilder<String> = ColumnBuilder::new();
    str_builder.push("hello");
    str_builder.push("world");
    
    let str_col = str_builder.build();  // Returns StringColumn
}
```

---

## Summary

| Concept | When to Use |
|---------|-------------|
| Concrete types | Fixed type set, different logic per type |
| Generics | Type-safe builders, algorithms, library APIs |
| Trait bounds `T: Trait` | Constrain what `T` can do |
| `where` clause | Complex bounds, multiple parameters |
| Associated types | Implementer chooses (one per type) |
| Generic parameters | Caller chooses (multiple possible) |
| Conditional impl | Methods only for certain types |
| `#[derive(...)]` | Auto-generate common traits |
| `PhantomData<T>` | Type marker without storage |
| `impl Into<T>` | Ergonomic APIs accepting multiple types |

**Your design pattern:** Concrete types for storage (simple, specialized), generics for operations (type-safe, reusable), with `TypedColumnRef` from the Traits tutorial bridging them.
