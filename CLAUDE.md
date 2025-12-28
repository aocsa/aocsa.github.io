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
- Push to `master` branch to deploy via GitHub Pages
- Custom domain: aocsa.dev (configured in CNAME)
- Build output in `dist/` folder

## Architecture

**React SPA with Vite build:**
- `src/main.tsx` - App entry point
- `src/App.tsx` - React Router setup
- `src/components/Layout.tsx` - Shared header & footer
- `src/pages/` - Page components (Home, Posts, PostView, Projects, Contact)
- `src/styles/main.css` - All styling
- `public/posts/` - Markdown blog posts + posts.json manifest

**Routes:**
- `/` - Home (Hero, About, Skills, Expertise, Work, Education)
- `/posts` - Blog posts list
- `/posts/:slug` - Individual blog post
- `/projects` - Projects page
- `/contact` - Contact form

**Key Design Patterns:**
- CSS custom properties in `:root` for colors, typography, spacing
- Fonts: Inter (sans-serif) + JetBrains Mono (monospace)
- Mobile-responsive with slide-out mobile menu
- Scroll-reveal animations via IntersectionObserver
- Contact form uses Formspree (no backend required)
- Markdown rendering with react-markdown, remark-gfm, rehype-highlight

**CSS Variable System:**
```css
--bg-primary, --bg-secondary, --text-primary, --text-secondary
--font-sans, --font-mono
--container-width, --section-padding
```

## Adding Blog Posts

1. Create markdown file: `public/posts/my-post.md`
2. Add entry to `public/posts/posts.json`:
   ```json
   { "slug": "my-post", "title": "My Post", "date": "2025-01-15", "tags": ["topic"] }
   ```
3. Rebuild: `npm run build`

## SPA Routing

GitHub Pages uses `public/404.html` to handle client-side routing. This redirects unknown paths to the SPA which React Router then handles.
