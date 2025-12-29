import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import { Post } from '../types/post'

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

function PostView() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readingTime, setReadingTime] = useState(0)

  useEffect(() => {
    if (!slug) return

    // First fetch the posts manifest to get metadata
    fetch('/posts/posts.json')
      .then(res => res.json())
      .then((posts: Post[]) => {
        // Store all posts for next/prev navigation (filter out drafts, sort by date)
        const publishedPosts = posts
          .filter(p => !p.draft)
          .sort((a, b) => b.date.localeCompare(a.date))
        setAllPosts(publishedPosts)

        const meta = posts.find(p => p.slug === slug)
        if (!meta) throw new Error('Post not found')

        // Then fetch the markdown content
        return fetch(`/posts/${meta.slug}.md`)
          .then(res => {
            if (!res.ok) throw new Error('Post content not found')
            return res.text()
          })
          .then(content => {
            // Remove the first H1 heading (title is shown in header)
            const processedContent = content.replace(/^#\s+.+\n+/, '')

            setReadingTime(calculateReadingTime(processedContent))
            setPost({ ...meta, content: processedContent })
            setLoading(false)
          })
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [slug])

  // Calculate next/prev posts based on date order
  const { prevPost, nextPost } = useMemo(() => {
    if (!post || allPosts.length === 0) return { prevPost: null, nextPost: null }
    const currentIndex = allPosts.findIndex(p => p.slug === post.slug)
    return {
      prevPost: currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null,
      nextPost: currentIndex > 0 ? allPosts[currentIndex - 1] : null
    }
  }, [post, allPosts])

  // Generate share URL
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/posts/${slug}`
    : ''

  if (loading) return <div className="loading">Loading post...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!post) return <div className="error">Post not found</div>

  return (
    <div className="post-view post-view-page post-view-clean">
      <article className="post-content">
        <header className="post-header">
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            <div className="post-meta-left">
              <span className="post-date">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span className="post-meta-separator">•</span>
              <span className="post-reading-time">{readingTime} min read</span>
            </div>
            <a
              href={`https://github.com/aocsa/aocsa.github.io/edit/master/public/posts/${post.slug}.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="post-edit-link"
            >
              |{' '}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit on GitHub
            </a>
          </div>
        </header>
        <div className="prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeSlug]}
          >
            {post.content}
          </ReactMarkdown>
        </div>
        <footer className="post-footer">
          {post.tags && post.tags.length > 0 && (
            <div className="post-footer-tags">
              {post.tags.map(tag => (
                <span key={tag} className="post-footer-tag">#{tag}</span>
              ))}
            </div>
          )}

          <div className="post-share">
            <span className="post-share-label">Share this post on:</span>
            <div className="post-share-icons">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on X"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(shareUrl)}`}
                aria-label="Share via Email"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </a>
            </div>
            <a href="#top" className="back-to-top">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              Back to Top
            </a>
          </div>

          <hr className="post-footer-divider" />

          <nav className="post-nav">
            {prevPost && (
              <Link to={`/posts/${prevPost.slug}`} className="post-nav-prev">
                <span className="post-nav-label">&larr; Previous Post</span>
                <span className="post-nav-title">{prevPost.title}</span>
              </Link>
            )}
            {nextPost && (
              <Link to={`/posts/${nextPost.slug}`} className="post-nav-next">
                <span className="post-nav-label">Next Post &rarr;</span>
                <span className="post-nav-title">{nextPost.title}</span>
              </Link>
            )}
          </nav>
        </footer>
      </article>
    </div>
  )
}

export default PostView
