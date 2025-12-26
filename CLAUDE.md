# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Alexander Ocsa (aocsa.dev), a System Software Engineer specializing in GPU computing and query engines. This is a static site hosted on GitHub Pages.

## Development

**Local Development:**
```bash
# Serve locally (use any static server)
python -m http.server 8000
# or
npx serve .
```

**Deployment:**
- Push to `master` branch to deploy via GitHub Pages
- Custom domain: aocsa.dev (configured in CNAME)

## Architecture

**Static single-page site with no build step:**
- `index.html` - Complete page structure with all sections (Hero, About, Skills, Expertise, Experience, Education, Projects, Contact)
- `styles.css` - All styling with CSS custom properties for theming
- `service-worker.js` - PWA offline caching support
- `manifest.json` - PWA manifest

**Key Design Patterns:**
- CSS custom properties defined in `:root` for colors, typography, and spacing
- Fonts: Inter (sans-serif) + JetBrains Mono (monospace)
- Mobile-responsive with slide-out mobile menu
- Scroll-reveal animations via IntersectionObserver
- Contact form uses Formspree (no backend required)

**CSS Variable System:**
```css
--bg-primary, --bg-secondary, --text-primary, --text-secondary
--font-sans, --font-mono
--container-width, --section-padding
```

## Cache Busting

When modifying `styles.css`, update the version query parameter in `index.html`:
```html
<link rel="stylesheet" href="/styles.css?v=7">
```

Also update `CACHE_NAME` in `service-worker.js` for PWA cache invalidation.
