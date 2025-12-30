# Async Rust: From Iterators to Streams

You've built a synchronous `CsvDataSource` that implements `Iterator`. It works great for local files. But what happens when your data lives on S3, or you're reading from multiple partitions?

This tutorial transforms your synchronous code into async, enabling concurrent I/O without blocking threads.

---

## What We're Building

By the end, you'll understand:

1. **Why async matters** for I/O-bound query engines
2. **Futures** - lazy computations that pause and resume
3. **async/await syntax** - writing async code that looks synchronous
4. **Streams** - the async version of Iterator
5. **Creating async streams** with the `async-stream` crate
6. **StreamExt** - map, filter, fold for streams
7. **Concurrent processing** - handling multiple data sources at once
8. **The tokio runtime** - executing async code

---

## Part 1: Why Async Matters

Your synchronous code has a problem:

```rust
// This BLOCKS the thread while waiting for I/O
let bytes_read = self.reader.read_line(&mut self.line_buffer)?;
```

When reading from network storage (S3, GCS), this blocks for tens to hundreds of milliseconds. With multiple partitions:

```
Thread 1: [read]----[wait 100ms]----[process]----[wait 100ms]----[read]...
Thread 2: [read]----[wait 100ms]----[process]----[wait 100ms]----[read]...
Thread 3: [read]----[wait 100ms]----[process]----[wait 100ms]----[read]...
```

Most time is spent **waiting**. You'd need many threads to keep CPUs busy.

With async, one thread manages many concurrent operations:

```
Single Thread: [start read 1][start read 2][start read 3]
               [process 1 when ready][process 2 when ready][process 3 when ready]
```

When one operation waits, work on another. This is why DataFusion uses async.

---

## Part 2: Futures - Lazy Computations

In C++, `std::async` starts work immediately on another thread:

```cpp
std::future<int> result = std::async(std::launch::async, []() {
    return expensive_computation();  // Running NOW on another thread
});
int value = result.get();  // Block until complete
```

Rust's `Future` is fundamentally different - it's **lazy**:

```rust
async fn expensive_computation() -> i32 {
    42
}

let future = expensive_computation();  // Returns Future, does NOTHING yet
let value = future.await;              // NOW it runs
```

A `Future` is a state machine describing work to be done. It doesn't execute until you `.await` it.

### The Future Trait

Under the hood:

```rust
pub trait Future {
    type Output;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}

pub enum Poll<T> {
    Ready(T),   // Done, here's the result
    Pending,    // Not ready, call me later
}
```

When you `.await` a future, the runtime calls `poll()` repeatedly until it returns `Ready`.

**Key insight:** `.await` is a **suspension point**. The function pauses, lets other work happen, and resumes when the awaited future is ready.

---

## Part 3: async/await Basics

```rust
// async fn returns impl Future<Output = T>
async fn fetch_data(url: &str) -> Result<String, Error> {
    let response = reqwest::get(url).await?;  // Suspend here
    let body = response.text().await?;         // Suspend here
    Ok(body)
}
```

**Key rules:**

1. `async fn` returns a `Future` - calling it doesn't execute anything
2. `.await` drives the future to completion (only works inside async context)
3. You need a **runtime** (tokio) to actually execute futures
4. Each `.await` is a potential suspension point

### Running Async Code

```rust
// The #[tokio::main] macro creates a runtime
#[tokio::main]
async fn main() {
    let result = fetch_data("https://example.com").await;
    println!("{:?}", result);
}
```

Without the runtime, futures do nothing.

---

## Part 4: From Iterator to Stream

Here's the parallel:

| Synchronous | Asynchronous |
|-------------|--------------|
| `Iterator` | `Stream` |
| `fn next(&mut self) -> Option<T>` | `fn poll_next(...) -> Poll<Option<T>>` |
| `for item in iter { }` | `while let Some(item) = stream.next().await { }` |

The `Stream` trait (from `futures` crate):

```rust
pub trait Stream {
    type Item;
    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>>;
}
```

Return values:
- `Poll::Ready(Some(item))` - here's an item
- `Poll::Ready(None)` - stream finished
- `Poll::Pending` - not ready, call later

---

## Part 5: Creating Async Streams

The easiest way to create streams is the `async-stream` crate.

Add to `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
futures = "0.3"
async-stream = "0.3"
```

### The try_stream! Macro

This macro lets you write async generators with `yield`:

```rust
use async_stream::try_stream;
use futures::Stream;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::fs::File;

impl AsyncCsvDataSource {
    pub fn scan(&self) -> impl Stream<Item = Result<RecordBatch, DataSourceError>> + '_ {
        let path = self.path.clone();
        let schema = self.schema.clone();
        let batch_size = self.batch_size;

        try_stream! {
            // Open file asynchronously
            let file = File::open(&path).await
                .map_err(|e| DataSourceError::IoError(e.to_string()))?;
            let mut reader = BufReader::new(file);

            let mut line = String::new();
            let mut rows: Vec<Vec<String>> = Vec::with_capacity(batch_size);

            loop {
                line.clear();
                let bytes = reader.read_line(&mut line).await
                    .map_err(|e| DataSourceError::IoError(e.to_string()))?;

                if bytes == 0 {
                    // EOF - yield remaining rows if any
                    if !rows.is_empty() {
                        let batch = create_batch(&schema, &rows)?;
                        yield batch;  // <-- Produces a value to the stream
                    }
                    break;
                }

                // Parse line and add to buffer
                let fields: Vec<String> = line.trim()
                    .split(',')
                    .map(|s| s.to_string())
                    .collect();
                rows.push(fields);

                // Yield batch when full
                if rows.len() >= batch_size {
                    let batch = create_batch(&schema, &rows)?;
                    rows.clear();
                    yield batch;  // <-- Suspend and produce value
                }
            }
        }
    }
}
```

**How it works:**
- `try_stream!` transforms your code into a `Stream` implementation
- `yield batch` suspends the function and produces a value
- `?` propagates errors (that's what the `try_` prefix enables)
- The stream resumes from where it left off on the next poll

---

## Part 6: Using Streams with StreamExt

The `StreamExt` trait adds familiar methods to streams:

```rust
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), DataSourceError> {
    let source = AsyncCsvDataSource::new("data.csv").await?;
    let mut stream = source.scan();

    // Method 1: while let loop
    while let Some(batch_result) = stream.next().await {
        let batch = batch_result?;
        println!("Got {} rows", batch.num_rows());
    }

    Ok(())
}
```

### Common StreamExt Methods

| Method | Description |
|--------|-------------|
| `.next()` | Get next item as Future |
| `.map(f)` | Transform each item |
| `.filter(f)` | Keep items matching predicate |
| `.filter_map(f)` | Filter and transform |
| `.take(n)` | Take first n items |
| `.fold(init, f)` | Reduce to single value |
| `.collect::<Vec<_>>()` | Collect all items |
| `.buffer_unordered(n)` | Process n items concurrently |

### Example: Counting Rows

```rust
use futures::StreamExt;

async fn count_rows(source: &AsyncCsvDataSource) -> Result<usize, DataSourceError> {
    let total = source.scan()
        .map(|result| result.map(|batch| batch.num_rows()))  // Extract row count
        .try_fold(0, |acc, rows| async move { Ok(acc + rows) })  // Sum them
        .await?;

    Ok(total)
}
```

---

## Part 7: Concurrent Processing

Here's where async shines. Process multiple files concurrently:

```rust
use futures::stream::{self, StreamExt};

async fn process_files(paths: Vec<String>) -> Result<usize, DataSourceError> {
    let total = stream::iter(paths)
        // For each path, create an async task
        .map(|path| async move {
            let source = AsyncCsvDataSource::new(&path).await?;
            let rows: usize = source.scan()
                .filter_map(|r| async { r.ok() })
                .map(|b| b.num_rows())
                .fold(0, |a, b| async move { a + b })
                .await;
            Ok::<_, DataSourceError>(rows)
        })
        // Process up to 4 files concurrently!
        .buffer_unordered(4)
        // Sum results
        .try_fold(0usize, |acc, rows| async move { Ok(acc + rows) })
        .await?;

    Ok(total)
}
```

**What's happening:**
1. `stream::iter(paths)` - create stream from vector
2. `.map(|path| async move {...})` - for each path, create a future
3. `.buffer_unordered(4)` - run up to 4 futures concurrently
4. When one file waits for I/O, others make progress

This processes 4 files concurrently on **a single thread**.

---

## Part 8: The Tokio Runtime

Futures need an executor to run. Tokio is the standard choice.

### Option 1: Main Macro (Simplest)

```rust
#[tokio::main]
async fn main() {
    // Async code here
}
```

### Option 2: Explicit Runtime

```rust
fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        // Async code here
    });
}
```

### Option 3: Multi-threaded

```rust
fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)
        .enable_all()
        .build()
        .unwrap();

    rt.block_on(async {
        // Work distributed across 4 threads
    });
}
```

### Spawning Tasks

```rust
use tokio::task;

#[tokio::main]
async fn main() {
    // Spawn runs concurrently
    let handle = task::spawn(async {
        expensive_computation().await
    });

    // Do other work while it runs...

    // Wait for result
    let result = handle.await.unwrap();
}
```

---

## Part 9: Async Traits

Rust doesn't fully support `async fn` in traits yet. Use the `async_trait` crate:

```toml
[dependencies]
async-trait = "0.1"
```

```rust
use async_trait::async_trait;
use futures::Stream;
use std::pin::Pin;

// Type alias for boxed streams
pub type BoxStream<'a, T> = Pin<Box<dyn Stream<Item = T> + Send + 'a>>;

#[async_trait]
pub trait AsyncDataSource: Send + Sync {
    fn schema(&self) -> &Schema;

    async fn scan(&self) -> Result<BoxStream<'static, Result<RecordBatch, DataSourceError>>, DataSourceError>;
}
```

Implement it:

```rust
#[async_trait]
impl AsyncDataSource for AsyncCsvDataSource {
    fn schema(&self) -> &Schema {
        &self.schema
    }

    async fn scan(&self) -> Result<BoxStream<'static, Result<RecordBatch, DataSourceError>>, DataSourceError> {
        // Create the stream and box it
        let stream = self.create_stream();
        Ok(Box::pin(stream))
    }
}
```

---

## Part 10: Understanding Pin (Brief)

You'll see `Pin<&mut Self>` in `Future` and `Stream` traits. Why?

When a future suspends at `.await`, it might hold references to its own data:

```rust
async fn example() {
    let data = vec![1, 2, 3];
    let reference = &data;      // Points to data
    some_async_op().await;      // Suspended here - future holds both data AND reference
    println!("{:?}", reference); // Still needs reference valid
}
```

If the future moves in memory while suspended, `reference` becomes invalid.

`Pin` guarantees the value won't move. **Practical rule:** Use `Box::pin(stream)` when returning streams, and let the `async-stream` crate handle the complexity when creating them.

---

## Complete Example

```rust
use async_stream::try_stream;
use futures::{Stream, StreamExt};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};

pub struct AsyncCsvDataSource {
    path: String,
    schema: Schema,
    batch_size: usize,
}

impl AsyncCsvDataSource {
    pub async fn new(path: &str) -> Result<Self, DataSourceError> {
        // In real code, you'd infer schema from file
        let schema = Schema::new(vec![
            Field::new("a", DataType::Int64),
            Field::new("b", DataType::String),
        ]);

        Ok(Self {
            path: path.to_string(),
            schema,
            batch_size: 1000,
        })
    }

    pub fn scan(&self) -> impl Stream<Item = Result<RecordBatch, DataSourceError>> + '_ {
        let path = self.path.clone();
        let schema = self.schema.clone();
        let batch_size = self.batch_size;

        try_stream! {
            let file = File::open(&path).await
                .map_err(|e| DataSourceError::IoError(e.to_string()))?;
            let mut reader = BufReader::new(file);

            // Skip header
            let mut header = String::new();
            reader.read_line(&mut header).await
                .map_err(|e| DataSourceError::IoError(e.to_string()))?;

            let mut line = String::new();
            let mut rows = Vec::with_capacity(batch_size);

            loop {
                line.clear();
                let bytes = reader.read_line(&mut line).await
                    .map_err(|e| DataSourceError::IoError(e.to_string()))?;

                if bytes == 0 {
                    if !rows.is_empty() {
                        yield create_batch(&schema, &rows)?;
                    }
                    break;
                }

                let fields: Vec<String> = line.trim()
                    .split(',')
                    .map(|s| s.to_string())
                    .collect();
                rows.push(fields);

                if rows.len() >= batch_size {
                    yield create_batch(&schema, &rows)?;
                    rows.clear();
                }
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), DataSourceError> {
    let source = AsyncCsvDataSource::new("test.csv").await?;

    let mut stream = source.scan();
    let mut total = 0;

    while let Some(batch_result) = stream.next().await {
        let batch = batch_result?;
        total += batch.num_rows();
        println!("Batch: {} rows", batch.num_rows());
    }

    println!("Total: {} rows", total);
    Ok(())
}
```

---

## Quick Reference

| Sync | Async |
|------|-------|
| `Iterator` | `Stream` |
| `next() -> Option<T>` | `next().await -> Option<T>` |
| `for x in iter` | `while let Some(x) = stream.next().await` |
| `.map()`, `.filter()` | `.map()`, `.filter()` (same names) |
| `.collect()` | `.collect::<Vec<_>>().await` |
| Blocking I/O | Non-blocking with `.await` |

---

## Summary

1. **Futures are lazy** - they don't run until `.await`ed
2. **`.await` suspends** - lets other work proceed while waiting
3. **`Stream` is async `Iterator`** - produces items asynchronously
4. **`try_stream!` macro** - easiest way to create streams
5. **`StreamExt`** - provides `map`, `filter`, `fold` for streams
6. **`.buffer_unordered(n)`** - process n items concurrently
7. **Tokio runtime** - executes futures with `#[tokio::main]`
8. **`async_trait`** - enables async methods in traits
9. **`Pin`** - ensures futures don't move in memory (use `Box::pin`)

Your synchronous `Iterator` becomes an async `Stream`. Your blocking I/O becomes non-blocking. One thread can process many data sources concurrently.

---

## Q&A

[Questions and answers will be added here]

## Quiz History

[Quiz sessions will be recorded here]