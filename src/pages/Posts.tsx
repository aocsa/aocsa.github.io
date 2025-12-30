import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Post } from '../types/post'

// Maximum number of tags to display (most relevant first)
const MAX_VISIBLE_TAGS = 8

function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/posts/posts.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch posts')
        return res.json()
      })
      .then((data: Post[]) => {
        // Filter out drafts and sort by date descending
        const published = data.filter(post => !post.draft)
        published.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setPosts(published)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Extract all unique tags with their counts, sorted by frequency
  const sortedTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    posts.forEach(post => {
      post.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    // Sort by count (descending), then alphabetically
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)
  }, [posts])

  // Limit visible tags to most relevant ones
  const visibleTags = sortedTags.slice(0, MAX_VISIBLE_TAGS)
  const hasMoreTags = sortedTags.length > MAX_VISIBLE_TAGS

  // Filter posts based on search query and selected tags
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Search filter (title and description)
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch = !query ||
        post.title.toLowerCase().includes(query) ||
        (post.description?.toLowerCase().includes(query) ?? false)

      // Tag filter (post must have ALL selected tags)
      const matchesTags = selectedTags.size === 0 ||
        Array.from(selectedTags).every(tag => post.tags?.includes(tag))

      return matchesSearch && matchesTags
    })
  }, [posts, searchQuery, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tag)) {
        newSet.delete(tag)
      } else {
        newSet.add(tag)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTags(new Set())
  }

  if (loading) return <div className="loading">Loading posts...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (posts.length === 0) return <div className="no-posts">No posts found.</div>

  // Group filtered posts by year
  const postsByYear = filteredPosts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(post)
    return acc
  }, {} as Record<number, Post[]>)

  const years = Object.keys(postsByYear).map(Number).sort((a, b) => b - a)
  const hasActiveFilters = searchQuery.trim() !== '' || selectedTags.size > 0

  return (
    <div className="posts-list-container posts-page">
      <h1 className="posts-title">Posts</h1>

      {/* Search and Filter Section */}
      <div className="posts-filter-section">
        <div className="posts-search-wrapper">
          <svg
            className="posts-search-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="posts-search-input"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="posts-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {visibleTags.length > 0 && (
          <div className="posts-tags-filter">
            {visibleTags.map(tag => (
              <button
                key={tag}
                className={`posts-tag-btn ${selectedTags.has(tag) ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
            {hasMoreTags && (
              <span className="posts-tags-more">
                +{sortedTags.length - MAX_VISIBLE_TAGS} more
              </span>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <div className="posts-filter-status">
            <span className="posts-filter-count">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} found
            </span>
            <button className="posts-clear-filters" onClick={clearFilters}>
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Posts List */}
      {years.length === 0 ? (
        <div className="posts-no-results">
          <p>No posts match your search criteria.</p>
          <button className="posts-clear-filters" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        years.map(year => (
          <div key={year} className="posts-year-group">
            <h2 className="posts-year">{year}</h2>
            <ul className="posts-list">
              {postsByYear[year].map(post => (
                <li key={post.slug} className="posts-item">
                  <Link to={`/posts/${post.slug}`} className="posts-link">
                    <div className="posts-item-content">
                      <span className="posts-item-title">{post.title}</span>
                      {post.description && (
                        <p className="posts-item-description">{post.description}</p>
                      )}
                    </div>
                    <span className="posts-item-date">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}

export default Posts
