#!/usr/bin/env node

/**
 * Blog Post Sync Script
 *
 * Scans public/posts/ for markdown files, extracts metadata,
 * renames files to YYYY-MM-DD-slug.md format, and updates posts.json.
 *
 * Key behavior:
 *   - Preserves existing posts.json entries
 *   - Only extracts metadata for new posts or missing fields
 *   - Removes entries for deleted files
 *
 * Supports metadata in:
 *   - YAML frontmatter (---\n...\n---)
 *   - Comment-style (// key: value)
 *
 * Usage:
 *   node scripts/sync-posts.js [options]
 *
 * Options:
 *   --dry-run       Preview changes without applying
 *   --no-rename     Update posts.json without renaming files
 *   --strip-meta    Remove metadata from markdown files after extraction
 *   --force         Rebuild all entries from scratch (ignore existing)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, '../public/posts');
const POSTS_JSON = path.join(POSTS_DIR, 'posts.json');

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_RENAME = args.includes('--no-rename');
const STRIP_META = args.includes('--strip-meta');
const FORCE = args.includes('--force');

// Required fields that every post entry must have
const REQUIRED_FIELDS = ['slug', 'title', 'date', 'tags'];

// =============================================================================
// Metadata Parsing
// =============================================================================

function parseYamlFrontmatter(content) {
  const patterns = [
    /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/,
    /^<!--\s*---\n([\s\S]*?)\n---\s*-->\n?([\s\S]*)$/
  ];

  for (const regex of patterns) {
    const match = content.match(regex);
    if (match) {
      return {
        data: parseYamlLines(match[1]),
        body: match[2]
      };
    }
  }
  return null;
}

function parseYamlLines(yamlStr) {
  const data = {};
  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = parseValue(line.slice(colonIdx + 1).trim());
    if (key) data[key] = value;
  }
  return data;
}

function parseCommentMetadata(content) {
  const lines = content.split('\n');
  const data = {};
  const metaLineIndices = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\/\/\s*(\w+):\s*(.+)$/);
    if (match) {
      data[match[1]] = parseValue(match[2].trim());
      metaLineIndices.push(i);
    }
    if (line.match(/^\/\/\s*---\s*$/)) {
      metaLineIndices.push(i);
    }
  }

  if (Object.keys(data).length === 0) return null;

  const bodyLines = lines.filter((_, i) => !metaLineIndices.includes(i));
  return { data, body: bodyLines.join('\n'), metaLineIndices };
}

function parseValue(str) {
  if (str.startsWith('[') && str.endsWith(']')) {
    return str.slice(1, -1)
      .split(',')
      .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(s => s.length > 0);
  }
  if ((str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  if (str === 'null' || str === '') return null;
  return str;
}

// =============================================================================
// Content Extraction
// =============================================================================

function extractTitle(content) {
  for (const line of content.split('\n')) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      const title = match[1].trim();
      if (!title.includes(':') || title.length > 60) return title;
    }
  }
  return null;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const dmy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function extractDateFromFilename(filename) {
  let match = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  if (match) return match[1];
  match = filename.match(/^(\d{1,2})-(\d{1,2})-(\d{4})-/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return null;
}

function getFileDate(filepath) {
  return fs.statSync(filepath).mtime.toISOString().split('T')[0];
}

function removeDatePrefix(filename) {
  return filename
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/^\d{1,2}-\d{1,2}-\d{4}-/, '');
}

// =============================================================================
// Tag Inference
// =============================================================================

const LANGUAGE_PATTERNS = {
  'rust': ['rust', 'cargo', '.rs', 'borrow checker', 'impl '],
  'c++': ['c++', 'cpp', 'unique_ptr', 'shared_ptr', 'std::', 'template<'],
  'python': ['python', 'def ', 'import ', '.py'],
  'javascript': ['javascript', 'node.js', '.js'],
};

const TOPIC_PATTERNS = {
  'performance': ['performance', 'optimization', 'faster', 'benchmark'],
  'memory': ['memory management', 'heap', 'stack allocation', 'raii'],
  'data-structures': ['btree', 'hash map', 'linked list', 'inverted index'],
  'parsing': ['recursive descent', 'lexer', 'tokeniz', 'ast'],
  'assembly': ['asm!', 'asm(', 'assembly', 'opcode'],
  'compilers': ['llvm', 'codegen', 'code generation'],
};

function inferTags(content, title = '') {
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const tags = new Set();

  const langScores = Object.entries(LANGUAGE_PATTERNS).map(([tag, patterns]) => {
    let score = 0;
    for (const p of patterns) {
      if (lowerTitle.includes(p)) score += 10;
      const matches = lowerContent.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
      if (matches) score += matches.length;
    }
    return { tag, score };
  });

  langScores
    .filter(l => l.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .forEach(l => tags.add(l.tag));

  for (const [tag, patterns] of Object.entries(TOPIC_PATTERNS)) {
    if (patterns.some(p => lowerContent.includes(p) || lowerTitle.includes(p))) {
      tags.add(tag);
    }
  }

  return Array.from(tags).slice(0, 4);
}

// =============================================================================
// Title Formatting
// =============================================================================

const TITLE_UPPERCASE = {
  'c++': 'C++', 'asm': 'ASM', 'btree': 'BTree', 'btrees': 'BTrees',
  'gpu': 'GPU', 'cpu': 'CPU', 'api': 'API', 'llvm': 'LLVM', 'ir': 'IR',
  'ast': 'AST', 'json': 'JSON', 'html': 'HTML', 'css': 'CSS',
};

const TITLE_LOWERCASE = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor',
  'on', 'at', 'to', 'by', 'with', 'in', 'of', 'vs'
]);

function formatTitle(text) {
  return text.split(' ').map((word, i) => {
    const lower = word.toLowerCase();
    if (TITLE_UPPERCASE[lower]) return TITLE_UPPERCASE[lower];
    if (i > 0 && TITLE_LOWERCASE.has(lower)) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// =============================================================================
// Post Processing
// =============================================================================

function loadExistingPosts() {
  if (!fs.existsSync(POSTS_JSON)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf-8'));
    const bySlug = {};
    for (const post of data) {
      if (post.slug) bySlug[post.slug] = post;
    }
    return bySlug;
  } catch {
    return {};
  }
}

function extractMetadataFromFile(filepath, filename) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const yaml = parseYamlFrontmatter(content);
  const comments = parseCommentMetadata(content);
  const meta = yaml?.data || comments?.data || {};
  const body = yaml?.body || comments?.body || content;

  const title = meta.title || extractTitle(body) ||
    formatTitle(removeDatePrefix(filename).replace(/\.md$/, '').replace(/-/g, ' '));

  const date = parseDate(meta.created) || parseDate(meta.date) ||
    extractDateFromFilename(filename) || getFileDate(filepath);

  const tags = meta.concepts || meta.tags || inferTags(content, title);
  const normalizedTags = (Array.isArray(tags) ? tags : [tags])
    .map(t => t.replace(/_/g, '-'))
    .slice(0, 5);

  const slugBase = removeDatePrefix(filename.replace(/\.md$/, ''));

  const postData = {
    slug: `${date}-${slugBase}`,
    title,
    date,
    tags: normalizedTags,
  };

  if (meta.description) postData.description = meta.description;
  if (meta.source_repo) postData.sourceRepo = meta.source_repo;
  if (meta.prerequisites?.length > 0) {
    postData.prerequisites = meta.prerequisites
      .map(p => p.replace(/^.*\//, '').replace(/\.md$/, ''))
      .filter(p => p.length > 0);
  }
  if (meta.last_updated) postData.lastUpdated = parseDate(meta.last_updated);

  return {
    postData,
    hasMetadata: !!(yaml || comments),
    originalContent: content,
  };
}

function hasMissingFields(existing) {
  return REQUIRED_FIELDS.some(field => !existing[field]);
}

function mergePostData(existing, extracted) {
  const merged = { ...existing };

  // Only fill in missing required fields
  for (const field of REQUIRED_FIELDS) {
    if (!merged[field] && extracted[field]) {
      merged[field] = extracted[field];
    }
  }

  // Fill in missing optional fields
  const optionalFields = ['description', 'sourceRepo', 'prerequisites', 'lastUpdated'];
  for (const field of optionalFields) {
    if (!merged[field] && extracted[field]) {
      merged[field] = extracted[field];
    }
  }

  return merged;
}

function processPost(filename, existingPosts) {
  const filepath = path.join(POSTS_DIR, filename);
  const slugBase = removeDatePrefix(filename.replace(/\.md$/, ''));
  const dateFromFilename = extractDateFromFilename(filename);

  // Try to find existing entry by various slug patterns
  const possibleSlugs = [
    filename.replace(/\.md$/, ''),
    dateFromFilename ? `${dateFromFilename}-${slugBase}` : null,
    slugBase,
  ].filter(Boolean);

  let existing = null;
  let existingSlug = null;
  for (const slug of possibleSlugs) {
    if (existingPosts[slug]) {
      existing = existingPosts[slug];
      existingSlug = slug;
      break;
    }
  }

  const needsExtraction = FORCE || !existing || hasMissingFields(existing);

  let postData;
  let hasMetadata = false;
  let originalContent = '';

  if (needsExtraction) {
    const extracted = extractMetadataFromFile(filepath, filename);
    hasMetadata = extracted.hasMetadata;
    originalContent = extracted.originalContent;

    if (existing && !FORCE) {
      postData = mergePostData(existing, extracted.postData);
    } else {
      postData = extracted.postData;
    }
  } else {
    postData = existing;
    originalContent = fs.readFileSync(filepath, 'utf-8');
    hasMetadata = !!parseYamlFrontmatter(originalContent) || !!parseCommentMetadata(originalContent);
  }

  // Compute expected filename
  const newFilename = `${postData.date}-${slugBase}.md`;
  const needsRename = filename !== newFilename;

  return {
    filename,
    newFilename,
    filepath,
    postData,
    needsRename,
    needsExtraction,
    existingSlug,
    hasMetadata,
    originalContent,
  };
}

function stripMetadata(content) {
  let stripped = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  stripped = stripped.replace(/^<!--\s*---\n[\s\S]*?\n---\s*-->\n?/, '');

  const lines = stripped.split('\n');
  const cleanLines = lines.filter(line =>
    !line.match(/^\/\/\s*\w+:\s*.+$/) && !line.match(/^\/\/\s*---\s*$/)
  );

  return cleanLines.join('\n').replace(/^\n+/, '');
}

// =============================================================================
// Topological Sorting by Prerequisites
// =============================================================================

/**
 * Calculate the dependency depth of each post.
 * Posts with no prerequisites have depth 0.
 * Posts that depend on depth-N posts have depth N+1.
 * This creates a natural learning order (foundations first, advanced last).
 */
function calculateDepth(post, postsBySlug, memo = new Map()) {
  if (memo.has(post.slug)) return memo.get(post.slug);

  if (!post.prerequisites || post.prerequisites.length === 0) {
    memo.set(post.slug, 0);
    return 0;
  }

  let maxPrereqDepth = -1;
  for (const prereqSlug of post.prerequisites) {
    const prereq = postsBySlug.get(prereqSlug);
    if (prereq) {
      const prereqDepth = calculateDepth(prereq, postsBySlug, memo);
      maxPrereqDepth = Math.max(maxPrereqDepth, prereqDepth);
    }
  }

  const depth = maxPrereqDepth + 1;
  memo.set(post.slug, depth);
  return depth;
}

/**
 * Sort posts by:
 * 1. sourceRepo (alphabetically)
 * 2. Dependency depth (ascending - foundations first, advanced last)
 * 3. Date (descending - newer first within same depth)
 */
function sortPostsTopologically(posts) {
  // Build lookup map
  const postsBySlug = new Map();
  posts.forEach(p => postsBySlug.set(p.slug, p));

  // Calculate depths
  const depthMemo = new Map();
  posts.forEach(p => calculateDepth(p, postsBySlug, depthMemo));

  // Sort
  return [...posts].sort((a, b) => {
    // 1. Sort by sourceRepo (alphabetically)
    const repoA = a.sourceRepo || '';
    const repoB = b.sourceRepo || '';
    if (repoA !== repoB) return repoA.localeCompare(repoB);

    // 2. Sort by depth (ascending - foundations first)
    const depthA = depthMemo.get(a.slug) || 0;
    const depthB = depthMemo.get(b.slug) || 0;
    if (depthA !== depthB) return depthA - depthB;

    // 3. Sort by date (descending - newer first within same depth)
    return b.date.localeCompare(a.date);
  });
}

// =============================================================================
// Main
// =============================================================================

function main() {
  console.log('📝 Blog Post Sync Script\n');

  if (DRY_RUN) console.log('🔍 DRY RUN - no changes will be made\n');
  if (NO_RENAME) console.log('📌 NO RENAME - files will keep original names\n');
  if (STRIP_META) console.log('🧹 STRIP META - metadata will be removed from files\n');
  if (FORCE) console.log('⚡ FORCE - rebuilding all entries from scratch\n');

  // Load existing posts.json
  const existingPosts = FORCE ? {} : loadExistingPosts();
  const existingSlugs = new Set(Object.keys(existingPosts));

  // Find markdown files
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No markdown files found.');
    return;
  }

  console.log(`Found ${files.length} post(s), ${existingSlugs.size} existing entries\n`);

  // Process all posts
  const posts = files.map(f => processPost(f, existingPosts));
  const processedSlugs = new Set(posts.map(p => p.postData.slug));

  // Track changes
  const newPosts = posts.filter(p => !p.existingSlug);
  const updatedPosts = posts.filter(p => p.existingSlug && p.needsExtraction);
  const unchangedPosts = posts.filter(p => p.existingSlug && !p.needsExtraction);
  const removedSlugs = [...existingSlugs].filter(slug => !processedSlugs.has(slug));

  // Display summary
  for (const post of posts) {
    const status = !post.existingSlug ? '🆕' : post.needsExtraction ? '📝' : '✓';
    console.log(`${status} ${post.filename}`);

    if (post.needsExtraction || DRY_RUN) {
      console.log(`   Title: ${post.postData.title}`);
      console.log(`   Date:  ${post.postData.date}`);
      console.log(`   Tags:  ${post.postData.tags.join(', ')}`);
    }

    if (post.needsRename && !NO_RENAME) {
      console.log(`   ➜ ${post.newFilename}`);
    }

    if (post.needsExtraction || DRY_RUN) console.log('');
  }

  if (removedSlugs.length > 0) {
    console.log(`\n🗑️  Removing ${removedSlugs.length} stale entries:`);
    removedSlugs.forEach(s => console.log(`   ${s}`));
  }

  console.log(`\n📊 Summary: ${newPosts.length} new, ${updatedPosts.length} updated, ${unchangedPosts.length} unchanged, ${removedSlugs.length} removed\n`);

  if (DRY_RUN) {
    console.log('📋 posts.json would contain:\n');
    const jsonData = sortPostsTopologically(posts.map(p => p.postData));
    console.log(JSON.stringify(jsonData, null, 2));
    return;
  }

  // Apply changes
  const renames = [];

  for (const post of posts) {
    // Rename files
    if (post.needsRename && !NO_RENAME) {
      const newPath = path.join(POSTS_DIR, post.newFilename);
      if (fs.existsSync(newPath) && post.filename !== post.newFilename) {
        console.log(`⚠️  Skip rename: ${post.newFilename} exists`);
        post.postData.slug = post.filename.replace(/\.md$/, '');
      } else {
        fs.renameSync(post.filepath, newPath);
        post.filepath = newPath;
        renames.push({ from: post.filename, to: post.newFilename });
      }
    } else if (NO_RENAME) {
      post.postData.slug = post.filename.replace(/\.md$/, '');
    }

    // Strip metadata from files
    if (STRIP_META && post.hasMetadata) {
      const cleanContent = stripMetadata(post.originalContent);
      fs.writeFileSync(post.filepath, cleanContent);
    }
  }

  // Write posts.json (sorted by sourceRepo, then by prerequisite depth, then by date)
  const jsonData = sortPostsTopologically(posts.map(p => p.postData));

  fs.writeFileSync(POSTS_JSON, JSON.stringify(jsonData, null, 2) + '\n');

  // Final summary
  console.log('─'.repeat(40));
  if (renames.length > 0) {
    console.log(`\n📂 Renamed ${renames.length} file(s):`);
    renames.forEach(r => console.log(`   ${r.from} → ${r.to}`));
  }
  console.log(`\n📋 Updated posts.json (${jsonData.length} entries)`);
  if (STRIP_META) {
    const stripped = posts.filter(p => p.hasMetadata).length;
    if (stripped > 0) console.log(`🧹 Stripped metadata from ${stripped} file(s)`);
  }
  console.log('\n✅ Done!');
}

main();
