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

function isGitHubLink(url: string): boolean {
  return url.includes('github.com')
}

function formatRepoName(url: string): string {
  // Extract repo name from GitHub URL (e.g., https://github.com/aocsa/rust-expr-evaluator)
  const match = url.match(/github\.com\/[^/]+\/([^/]+)/)
  if (!match) return ''

  const repoName = match[1].replace(/\.git$/, '') // Remove .git suffix if present

  // Convert kebab-case to Title Case (e.g., rust-expr-evaluator -> Rust Expr Evaluator)
  const formatted = repoName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return `${formatted} Project`
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

  // Get prerequisite posts with their titles
  const prerequisitePosts = useMemo(() => {
    if (!post?.prerequisites || allPosts.length === 0) return []
    return post.prerequisites
      .map(prereqSlug => allPosts.find(p => p.slug === prereqSlug))
      .filter((p): p is Post => p !== undefined)
  }, [post, allPosts])

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
        {prerequisitePosts.length > 0 && (
          <div className="post-prerequisites">
            <div className="prerequisites-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Before reading this post, you might want to check out:</span>
            </div>
            <ul className="prerequisites-list">
              {prerequisitePosts.map(prereq => (
                <li key={prereq.slug}>
                  <Link to={`/posts/${prereq.slug}`}>{prereq.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeSlug]}
          >
            {post.content}
          </ReactMarkdown>
        </div>
        <footer className="post-footer">
          {post.sourceRepo && isGitHubLink(post.sourceRepo) && (
            <a
              href={post.sourceRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="source-repo-link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {formatRepoName(post.sourceRepo)}
            </a>
          )}

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
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
