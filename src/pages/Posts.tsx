import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Post } from '../types/post'

function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <div className="loading">Loading posts...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (posts.length === 0) return <div className="no-posts">No posts found.</div>

  // Group posts by year
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(post)
    return acc
  }, {} as Record<number, Post[]>)

  const years = Object.keys(postsByYear).map(Number).sort((a, b) => b - a)

  return (
    <div className="posts-list-container posts-page">
      <h1 className="posts-title">Posts</h1>
      {years.map(year => (
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
      ))}
    </div>
  )
}

export default Posts
