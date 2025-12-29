# Alexander Ocsa - Portfolio & Blog

A React-based portfolio and blog site for [aocsa.dev](https://aocsa.dev), built with Vite and TypeScript.

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:5173/`

## Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist/` folder.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
aocsa.github.io/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Router setup
│   ├── components/
│   │   ├── Layout.tsx        # Header & footer
│   │   ├── TableOfContents.tsx
│   │   └── home/             # Home page section components
│   │       ├── Hero.tsx
│   │       ├── About.tsx
│   │       ├── Skills.tsx
│   │       ├── Expertise.tsx
│   │       ├── Work.tsx
│   │       ├── Education.tsx
│   │       └── Contact.tsx   # Shared: used in Home and /contact page
│   ├── pages/
│   │   ├── Home.tsx          # Landing page (all sections)
│   │   ├── Posts.tsx         # Posts index page
│   │   ├── PostView.tsx      # Single post page
│   │   ├── Projects.tsx      # Projects page
│   │   └── Contact.tsx       # Contact page (uses shared component)
│   ├── types/
│   │   └── post.ts           # TypeScript interfaces
│   └── styles/
│       └── main.css          # All styles
├── public/
│   ├── posts/
│   │   ├── posts.json        # Post manifest
│   │   └── *.md              # Markdown posts
│   ├── favicon.svg
│   ├── manifest.json
│   └── 404.html              # SPA routing fallback
├── index.html                # Vite entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Adding New Posts

1. Create a markdown file in `public/posts/` with optional frontmatter:

   ```markdown
   ---
   concepts: [rust, parsing]
   description: A tutorial about parsing in Rust
   created: 2025-01-15
   source_repo: my-project
   ---

   # My New Post Title

   Your content here...
   ```

2. Run the sync script to update `posts.json`:

   ```bash
   npm run sync-posts
   ```

3. Rebuild:

   ```bash
   npm run build
   ```

## Blog Post Sync Script

The `sync-posts` script automatically manages `posts.json` by scanning markdown files in `public/posts/`.

### Commands

```bash
npm run sync-posts        # Smart sync (preserves existing entries)
npm run sync-posts:dry    # Preview changes without applying
npm run sync-posts:force  # Rebuild all entries from scratch
npm run sync-posts:strip  # Sync and remove metadata from .md files
```

### How It Works

**Input:** Markdown files in `public/posts/` with optional metadata (YAML frontmatter or `// key: value` comments)

**Output:** Updated `posts.json` and optionally renamed files in `YYYY-MM-DD-slug.md` format

**Behavior:**
- Extracts metadata from frontmatter or infers from content
- Preserves existing `posts.json` entries (only fills missing fields)
- Renames files to consistent `YYYY-MM-DD-slug.md` format
- Removes entries for deleted files
- With `--strip-meta`: removes metadata from `.md` files after extraction

### Supported Metadata

| Source Field | JSON Field | Description |
|--------------|------------|-------------|
| `concepts` or `tags` | `tags` | Topic tags array |
| `description` | `description` | Post summary |
| `created` or `date` | `date` | Publication date (YYYY-MM-DD or DD-MM-YYYY) |
| `source_repo` | `sourceRepo` | Related repository name |
| `prerequisites` | `prerequisites` | Required reading (post slugs) |
| `last_updated` | `lastUpdated` | Last modification date |

### Example

**Before** (`my-post.md`):
```markdown
---
concepts: [rust, memory]
description: Learn Rust ownership
created: 15-01-2025
---

# Rust Ownership Guide
...
```

**After** `npm run sync-posts`:
- File renamed to `2025-01-15-my-post.md`
- Entry added to `posts.json`:
  ```json
  {
    "slug": "2025-01-15-my-post",
    "title": "Rust Ownership Guide",
    "date": "2025-01-15",
    "tags": ["rust", "memory"],
    "description": "Learn Rust ownership"
  }
  ```

## Post Metadata Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-friendly identifier (must match markdown filename) |
| `title` | string | Yes | Display title |
| `date` | string | Yes | ISO date format (YYYY-MM-DD) |
| `tags` | string[] | No | Array of tags |
| `description` | string | No | Short summary |
| `draft` | boolean | No | Set to `true` to hide from listing |

## Tech Stack

- **React 18** - UI framework
- **React Router 6** - Client-side routing
- **Vite** - Build tool
- **TypeScript** - Type safety
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown
- **rehype-highlight** - Syntax highlighting
- **rehype-slug** - Heading anchors for TOC

## Deployment

Deploy to GitHub Pages using the deploy script:

```bash
npm run deploy
```

This script:
1. Builds the project
2. Pushes `dist/` contents to the `gh-pages` branch
3. GitHub Pages serves from the `gh-pages` branch

**GitHub Pages Configuration:**
- Go to Settings → Pages
- Source: Deploy from branch
- Branch: `gh-pages` / `/ (root)`

**Custom Domain:**
- Domain: aocsa.dev
- CNAME file is in `public/` (copied to `dist/` on build)

For GitHub Pages to work with client-side routing, the `public/404.html` file handles redirects.
