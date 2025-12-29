export interface Post {
  slug: string
  title: string
  date: string
  tags?: string[]
  description?: string
  draft?: boolean
  content?: string
  sourceRepo?: string
  prerequisites?: string[]
  lastUpdated?: string
}

export interface Heading {
  id: string
  text: string
  level: number
}
