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
│   │   └── TableOfContents.tsx
│   ├── pages/
│   │   ├── Home.tsx          # Landing page (Hero, About, Skills, Expertise, Work, Education)
│   │   ├── Posts.tsx         # Posts index page
│   │   ├── PostView.tsx      # Single post page
│   │   ├── Projects.tsx      # Projects page
│   │   └── Contact.tsx       # Contact form page
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

1. Create a markdown file in `public/posts/`:

   ```bash
   touch public/posts/my-new-post.md
   ```

2. Add the post metadata to `public/posts/posts.json`:

   ```json
   {
     "slug": "my-new-post",
     "title": "My New Post Title",
     "date": "2025-01-15",
     "tags": ["topic1", "topic2"]
   }
   ```

3. Write your content in the markdown file.

4. Rebuild:

   ```bash
   npm run build
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

This site is deployed via GitHub Pages. Push to the `master` branch to trigger a deployment.

For GitHub Pages to work with client-side routing, the `public/404.html` file handles redirects.
