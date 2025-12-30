import { Post } from '../types/post'

/**
 * Calculate the dependency depth of each post.
 * Posts with no prerequisites have depth 0.
 * Posts that depend on depth-N posts have depth N+1.
 * This creates a natural learning order (foundations first, advanced last).
 */
export function calculatePostDepths(posts: Post[]): Map<string, number> {
  const postsBySlug = new Map<string, Post>()
  posts.forEach(p => postsBySlug.set(p.slug, p))

  const depthMemo = new Map<string, number>()

  const calculateDepth = (post: Post): number => {
    if (depthMemo.has(post.slug)) return depthMemo.get(post.slug)!

    if (!post.prerequisites || post.prerequisites.length === 0) {
      depthMemo.set(post.slug, 0)
      return 0
    }

    let maxPrereqDepth = -1
    for (const prereqSlug of post.prerequisites) {
      const prereq = postsBySlug.get(prereqSlug)
      if (prereq) {
        maxPrereqDepth = Math.max(maxPrereqDepth, calculateDepth(prereq))
      }
    }

    const depth = maxPrereqDepth + 1
    depthMemo.set(post.slug, depth)
    return depth
  }

  posts.forEach(p => calculateDepth(p))
  return depthMemo
}

/**
 * Sort posts topologically based on prerequisites and other criteria.
 * Order: sourceRepo (asc), depth (asc), date (desc)
 */
export function sortPostsTopologically(posts: Post[]): Post[] {
  const depthMemo = calculatePostDepths(posts)

  return [...posts].sort((a, b) => {
    // 1. Sort by sourceRepo (alphabetically)
    const repoA = a.sourceRepo || ''
    const repoB = b.sourceRepo || ''
    if (repoA !== repoB) return repoA.localeCompare(repoB)

    // 2. Sort by depth (ascending - foundations first)
    const depthA = depthMemo.get(a.slug) || 0
    const depthB = depthMemo.get(b.slug) || 0
    if (depthA !== depthB) return depthA - depthB

    // 3. Sort by date (descending - newer first within same depth)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}
