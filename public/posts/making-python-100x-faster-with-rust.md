Python is famously slow for compute-intensive tasks. But what if you could keep Python's ergonomics while getting Rust's performance? In this post, I'll show you how I made a data processing pipeline 100x faster with less than 100 lines of Rust.

## The Problem

I had a Python script that processed millions of records from a database. The core logic looked something like this:

```python
def process_records(records: list[dict]) -> list[dict]:
    results = []
    for record in records:
        # Complex transformation
        transformed = transform(record)
        if validate(transformed):
            results.append(transformed)
    return results
```

Processing 10 million records took about 45 minutes. Unacceptable.

## Why Python is Slow

Python's dynamic typing and interpreted nature make it flexible but slow:

1. **Type checking at runtime** - Every operation checks types
2. **Object overhead** - Everything is an object with metadata
3. **GIL** - The Global Interpreter Lock prevents true parallelism

## Enter PyO3

[PyO3](https://pyo3.rs/) is a Rust crate that makes it easy to write Python extensions in Rust. Here's the magic:

```rust
use pyo3::prelude::*;

#[pyfunction]
fn process_records(records: Vec<HashMap<String, String>>) -> Vec<HashMap<String, String>> {
    records
        .into_par_iter() // Parallel iteration!
        .filter_map(|record| {
            let transformed = transform(&record);
            if validate(&transformed) {
                Some(transformed)
            } else {
                None
            }
        })
        .collect()
}

#[pymodule]
fn fast_processor(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(process_records, m)?)?;
    Ok(())
}
```

## The Results

| Version | Time | Speedup |
|---------|------|---------|
| Pure Python | 45 min | 1x |
| Python + NumPy | 12 min | 3.75x |
| Rust via PyO3 | 27 sec | 100x |

## Key Takeaways

1. **Don't rewrite everything** - Only optimize the hot path
2. **Rayon makes parallelism trivial** - `into_par_iter()` is magic
3. **Keep the Python interface** - Your team can still use Python

The full code is available on [GitHub](https://github.com/example/fast-processor).
