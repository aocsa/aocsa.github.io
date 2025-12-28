Full-text search is everywhere: Google, Elasticsearch, your IDE's "Find in Files" feature. But how does it actually work? In this post, we'll build a mental model for full-text search by exploring BTrees and inverted indices.

## The Naive Approach

The simplest way to search text is to scan every document:

```python
def search(documents: list[str], query: str) -> list[int]:
    return [i for i, doc in enumerate(documents) if query in doc]
```

This is O(n * m) where n is the number of documents and m is the average document length. For a million documents, this is painfully slow.

## Inverted Indices

An inverted index flips the problem around. Instead of "document -> words", we store "word -> documents":

```python
index = {
    "rust": [1, 5, 23, 156],
    "python": [2, 5, 89, 234],
    "performance": [1, 23, 89],
}
```

Now searching for "rust" is O(1) - just look up the word in the index!

## BTrees for Efficient Storage

But how do we store this index efficiently? Enter the BTree.

### What is a BTree?

A BTree is a self-balancing tree data structure that maintains sorted data and allows searches, insertions, and deletions in O(log n) time.

```
        [M]
       /   \
    [D,G]  [P,T,X]
   /  |  \   / | \ \
  ... ... ...  ...
```

### Why BTrees for Search?

1. **Disk-friendly** - BTrees minimize disk I/O by storing many keys per node
2. **Range queries** - Find all words starting with "per" efficiently
3. **Sorted order** - Enables prefix matching and fuzzy search

## Building a Simple Search Engine

Let's combine these concepts:

```rust
use std::collections::{BTreeMap, HashSet};

struct SearchEngine {
    // word -> set of document IDs
    index: BTreeMap<String, HashSet<usize>>,
    documents: Vec<String>,
}

impl SearchEngine {
    fn index_document(&mut self, doc: String) {
        let doc_id = self.documents.len();

        for word in doc.split_whitespace() {
            let word = word.to_lowercase();
            self.index
                .entry(word)
                .or_insert_with(HashSet::new)
                .insert(doc_id);
        }

        self.documents.push(doc);
    }

    fn search(&self, query: &str) -> Vec<usize> {
        self.index
            .get(&query.to_lowercase())
            .map(|ids| ids.iter().copied().collect())
            .unwrap_or_default()
    }
}
```

## Advanced Topics

### TF-IDF Scoring

Not all matches are equal. Term Frequency-Inverse Document Frequency (TF-IDF) ranks results by relevance:

```
TF-IDF = (times word appears in doc) * log(total docs / docs with word)
```

### Tokenization

Real search engines don't just split on whitespace. They:
- Remove stop words ("the", "a", "is")
- Apply stemming ("running" -> "run")
- Handle synonyms

## Conclusion

Full-text search combines elegant data structures (BTrees, inverted indices) with clever algorithms (TF-IDF, tokenization) to enable fast, relevant search across massive document collections.

Next time you use Ctrl+F, you'll know what's happening under the hood!
