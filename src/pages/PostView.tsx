import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import { Post, Heading } from '../types/post'
import TableOfContents from '../components/TableOfContents'

function PostView() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    // First fetch the posts manifest to get metadata
    fetch('/posts/posts.json')
      .then(res => res.json())
      .then((posts: Post[]) => {
        const meta = posts.find(p => p.slug === slug)
        if (!meta) throw new Error('Post not found')

        // Then fetch the markdown content
        return fetch(`/posts/${meta.slug}.md`)
          .then(res => {
            if (!res.ok) throw new Error('Post content not found')
            return res.text()
          })
          .then(content => {
            // Extract headings for TOC (only h2 and h3)
            const headingRegex = /^(#{2,3})\s+(.+)$/gm
            const extractedHeadings: Heading[] = []
            let match

            while ((match = headingRegex.exec(content)) !== null) {
              const level = match[1].length
              const text = match[2]
              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
              extractedHeadings.push({ id, text, level })
            }

            setHeadings(extractedHeadings)
            setPost({ ...meta, content })
            setLoading(false)
          })
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [slug])

  if (loading) return <div className="loading">Loading post...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!post) return <div className="error">Post not found</div>

  return (
    <div className="post-view post-view-page">
      <aside className="post-sidebar">
        <Link to="/posts" className="back-link">
          <span>&larr;</span> All Posts
        </Link>
        <TableOfContents headings={headings} />
      </aside>
      <article className="post-content">
        <header className="post-header">
          <time className="post-date">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <h1 className="post-title">{post.title}</h1>
          {post.tags && post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map(tag => (
                <span key={tag} className="post-tag">#{tag}</span>
              ))}
            </div>
          )}
        </header>
        <div className="prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeSlug]}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}

export default PostView
