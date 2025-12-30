import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Post } from '../types/post'
import { sortPostsTopologically } from '../utils/postSorting'

/**
 * Shape of the data and functions provided by the PostContext.
 */
interface PostContextType {
  /** All published posts, sorted topologically by project and prerequisites */
  posts: Post[]
  /** Whether the posts manifest is still being fetched or processed */
  loading: boolean
  /** Error message if fetching or processing failed */
  error: string | null
  /** Helper to find a specific post's metadata using its slug */
  getPostBySlug: (slug: string) => Post | undefined
  /** Helper to find the logically previous and next posts relative to a given slug */
  getAdjacentPosts: (slug: string) => { prevPost: Post | null, nextPost: Post | null }
}

const PostContext = createContext<PostContextType | undefined>(undefined)

/**
 * PostProvider component that manage the global state for all blog posts.
 * It fetches the posts manifest once on load, filters out drafts, and 
 * calculates the topological sort order (foundations -> advanced) for the entire app.
 */
export function PostProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/posts/posts.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch posts manifest')
        return res.json()
      })
      .then((data: Post[]) => {
        // Filter out drafts to ensure only public content is processed
        const published = data.filter(p => !p.draft)

        // Compute the definitive order for the application.
        // This takes into account sourceRepo grouping and prerequisite depth.
        const sorted = sortPostsTopologically(published)
        setPosts(sorted)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  /** Finds a post by its unique URL slug */
  const getPostBySlug = (slug: string) => {
    return posts.find(p => p.slug === slug)
  }

  /** 
   * Finds navigation peers for a post. 
   * 'Previous' is the post that logically should be read before this one.
   * 'Next' is the post that logically follows.
   */
  const getAdjacentPosts = (slug: string) => {
    const index = posts.findIndex(p => p.slug === slug)
    if (index === -1) return { prevPost: null, nextPost: null }

    return {
      prevPost: index > 0 ? posts[index - 1] : null,
      nextPost: index < posts.length - 1 ? posts[index + 1] : null
    }
  }

  return (
    <PostContext.Provider value={{ posts, loading, error, getPostBySlug, getAdjacentPosts }}>
      {children}
    </PostContext.Provider>
  )
}

/**
 * Custom hook to access blog post data and navigation helpers.
 * Must be used within a PostProvider.
 * 
 * @example
 * const { posts, getAdjacentPosts } = usePosts();
 * const { prevPost, nextPost } = getAdjacentPosts(currentSlug);
 */
export function usePosts() {
  const context = useContext(PostContext)
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider')
  }
  return context
}
