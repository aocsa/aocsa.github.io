# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Alexander Ocsa (aocsa.dev), a System Software Engineer specializing in GPU computing and query engines. React SPA with blog, hosted on GitHub Pages.

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173/)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build
```

**Deployment:**
```bash
npm run deploy         # Build and deploy to gh-pages branch
```
- Custom domain: aocsa.dev (configured in CNAME)
- Build output in `dist/` folder
- Deploys to `gh-pages` branch (GitHub Pages serves from this branch)

## Architecture

**React SPA with Vite build:**
- `src/main.tsx` - App entry point
- `src/App.tsx` - React Router setup
- `src/components/Layout.tsx` - Shared header & footer
- `src/components/home/` - Home page section components
- `src/pages/` - Page components (Home, Posts, PostView, Projects, Contact)
- `src/styles/main.css` - All styling
- `public/content/posts/` - Markdown blog posts + posts.json manifest

**Routes:**
- `/` - Home (Hero, About, Skills, Expertise, Work, Education, Contact)
- `/posts` - Blog posts list
- `/posts/:slug` - Individual blog post
- `/projects` - Projects page
- `/contact` - Contact form (also embedded in Home page)

**Key Design Patterns:**
- CSS custom properties in `:root` for colors, typography, spacing
- Fonts: Inter (sans-serif) + JetBrains Mono (monospace)
- Mobile-responsive with slide-out mobile menu
- Contact form uses Formspree (no backend required)
- Markdown rendering with react-markdown, remark-gfm, rehype-highlight
- Shared components (e.g., Contact) can be used as both sections and standalone pages

**CSS Variable System:**
```css
--bg-primary, --bg-secondary, --text-primary, --text-secondary
--font-sans, --font-mono
--container-width, --section-padding
```

## Content vs Routes

To avoid SPA routing conflicts, content files are stored separately from routes:
- **Routes**: `/posts/slug` → React Router renders PostView component
- **Content**: `/content/posts/slug.md` → Static markdown files

This prevents ambiguity where a URL like `/posts/my-post` could match either a React route OR a static `.md` file.

## Adding Blog Posts

1. Create markdown file in `public/content/posts/` with optional metadata:
   ```markdown
   ---
   concepts: [rust, parsing]
   description: A tutorial about parsing in Rust
   created: 2025-01-15
   ---

   # My Post Title

   Content here...
   ```

2. Run sync to update `posts.json`:
   ```bash
   npm run sync-posts
   ```

3. Rebuild: `npm run build`

## Blog Post Sync Script

The `sync-posts` script automatically manages `public/content/posts/posts.json` by scanning markdown files.

**Commands:**
```bash
npm run sync-posts        # Smart sync (preserves existing entries)
npm run sync-posts:dry    # Preview changes without applying
npm run sync-posts:force  # Rebuild all entries from scratch
npm run sync-posts:strip  # Sync and remove metadata from .md files
```

**What it does:**
- Scans `public/content/posts/*.md` files for metadata
- Extracts title, date, tags, description, prerequisites, sourceRepo
- Renames files to `YYYY-MM-DD-slug.md` format
- Updates `posts.json` with extracted/inferred metadata
- Preserves existing entries (only updates missing fields)
- Removes stale entries for deleted files

**Supported metadata formats:**
- YAML frontmatter: `---\nconcepts: [a, b]\n---`
- Comment-style: `// concepts: [a, b]`

**Metadata fields:**
| Field | Maps to | Description |
|-------|---------|-------------|
| `concepts` / `tags` | `tags` | Array of topic tags |
| `description` | `description` | Post summary |
| `created` / `date` | `date` | Publication date |
| `source_repo` | `sourceRepo` | Related repository |
| `prerequisites` | `prerequisites` | Required reading (slugs) |
| `last_updated` | `lastUpdated` | Last modification date |

## SPA Routing

GitHub Pages uses `public/404.html` to handle client-side routing. This redirects unknown paths to the SPA which React Router then handles.

## Deployment Script

The `deploy` script automates pushing built files to the `gh-pages` branch:

```bash
npm run deploy
```

**What it does:**
1. Builds the project (`npm run build`)
2. Copies `dist/` contents to a temp directory
3. Switches to `gh-pages` branch (creates as orphan if needed)
4. Replaces all files with built contents
5. Commits and pushes to `origin/gh-pages`
6. Switches back to original branch

**GitHub Pages Configuration:**
- Settings → Pages → Source: Deploy from branch
- Branch: `gh-pages` / `/ (root)`
