import type { Post } from './posts-data'

// Configure giscus: https://giscus.app/
// Set GISCUS_REPO and GISCUS_REPO_ID after enabling GitHub Discussions on your repo.
const GISCUS_REPO = 'SomeBlackMagic/someblackmagic-com'
const GISCUS_REPO_ID = '' // fill in from giscus.app
const GISCUS_CATEGORY = 'Announcements'
const GISCUS_CATEGORY_ID = '' // fill in from giscus.app

function giscusWidget(): string {
  if (!GISCUS_REPO_ID || !GISCUS_CATEGORY_ID) return ''
  return `
  <section class="comments">
    <h2 class="comments-title">Comments</h2>
    <script src="https://giscus.app/client.js"
      data-repo="${GISCUS_REPO}"
      data-repo-id="${GISCUS_REPO_ID}"
      data-category="${GISCUS_CATEGORY}"
      data-category-id="${GISCUS_CATEGORY_ID}"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="top"
      data-theme="dark"
      data-lang="en"
      data-loading="lazy"
      crossorigin="anonymous"
      async>
    </script>
  </section>`
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f0f0f;
    --surface: #1a1a1a;
    --border: #2a2a2a;
    --text: #e8e8e8;
    --muted: #888;
    --accent: #a855f7;
    --accent-dim: #7c3aed;
    --code-bg: #161616;
    font-size: 16px;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    line-height: 1.7;
    min-height: 100vh;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  header {
    border-bottom: 1px solid var(--border);
    padding: 1.25rem 0;
  }
  .container { max-width: 720px; margin: 0 auto; padding: 0 1.5rem; }
  header .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .site-title { font-size: 1.1rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
  .site-title span { color: var(--accent); }
  nav { display: flex; gap: 1.5rem; }
  nav a { color: var(--muted); font-size: 0.9rem; }
  nav a:hover { color: var(--text); text-decoration: none; }
  main { padding: 3rem 0; }
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
  }
  .page-subtitle { color: var(--muted); margin-bottom: 2.5rem; font-size: 0.95rem; }
  .post-list { display: flex; flex-direction: column; gap: 0; }
  .post-item {
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--border);
  }
  .post-item:first-child { border-top: 1px solid var(--border); }
  .post-item-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.4rem;
  }
  .post-date { color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
  .post-tags { display: flex; gap: 0.4rem; }
  .tag {
    background: var(--surface);
    color: var(--accent);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.1rem 0.5rem;
    font-size: 0.75rem;
  }
  .post-title { font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem; }
  .post-title a { color: var(--text); }
  .post-title a:hover { color: var(--accent); text-decoration: none; }
  .post-desc { color: var(--muted); font-size: 0.9rem; }
  .empty { color: var(--muted); padding: 2rem 0; }

  /* Article */
  .article-header { margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
  .article-title { font-size: 2.2rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.75rem; line-height: 1.2; }
  .article-meta { color: var(--muted); font-size: 0.9rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .article-body { max-width: 65ch; }
  .article-body h1, .article-body h2, .article-body h3,
  .article-body h4, .article-body h5, .article-body h6 {
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 2rem 0 0.75rem;
    line-height: 1.3;
  }
  .article-body h2 { font-size: 1.4rem; }
  .article-body h3 { font-size: 1.15rem; }
  .article-body p { margin: 1rem 0; }
  .article-body ul, .article-body ol { margin: 1rem 0 1rem 1.5rem; }
  .article-body li { margin: 0.3rem 0; }
  .article-body blockquote {
    border-left: 3px solid var(--accent);
    margin: 1.5rem 0;
    padding: 0.5rem 1.25rem;
    color: var(--muted);
  }
  .article-body code {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.15em 0.4em;
    font-size: 0.875em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  .article-body pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1rem 1.25rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }
  .article-body pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.875rem;
  }
  .article-body img { max-width: 100%; border-radius: 6px; margin: 1.5rem 0; }
  .article-body hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
  .back-link { margin-bottom: 2rem; display: block; color: var(--muted); font-size: 0.9rem; }
  .back-link:hover { color: var(--text); text-decoration: none; }
  footer {
    border-top: 1px solid var(--border);
    padding: 1.5rem 0;
    color: var(--muted);
    font-size: 0.85rem;
  }
  footer .container { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
  .comments { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
  .comments-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1.5rem; }
`

function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(title)}" />
  <!-- Favicon: modern SVG (all modern browsers) -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <!-- Favicon: legacy ICO (old browsers, Windows pinned sites) -->
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <!-- Favicon: explicit PNG sizes -->
  <link rel="icon" href="/favicon-96x96.png" sizes="96x96" type="image/png" />
  <!-- Apple touch icon (iOS, iPadOS, macOS bookmark) -->
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <!-- Web App Manifest (Android, PWA) -->
  <link rel="manifest" href="/site.webmanifest" />
  <!-- Browser chrome / taskbar color -->
  <meta name="theme-color" content="#0f0f0f" />
  <!-- MS Tiles (Windows) -->
  <meta name="msapplication-TileColor" content="#0f0f0f" />
  <meta name="msapplication-TileImage" content="/icon-192x192.png" />
  <style>${CSS}</style>
</head>
<body>
  <header>
    <div class="container">
      <a href="/" class="site-title">Some<span>BlackMagic</span></a>
      <nav>
        <a href="/">Blog</a>
        <a href="/about">About</a>
      </nav>
    </div>
  </header>
  ${content}
  <footer>
    <div class="container">
      <span>© ${new Date().getFullYear()} SomeBlackMagic</span>
      <span>Powered by Cloudflare Workers</span>
    </div>
  </footer>
</body>
</html>`
}

export function renderIndex(posts: Post[]): string {
  const items = posts.length === 0
    ? '<p class="empty">No posts yet.</p>'
    : posts.map(p => `
      <article class="post-item">
        <div class="post-item-meta">
          <time class="post-date">${p.date}</time>
          ${p.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
        </div>
        <h2 class="post-title"><a href="/blog/${p.slug}">${escHtml(p.title)}</a></h2>
        ${p.description ? `<p class="post-desc">${escHtml(p.description)}</p>` : ''}
      </article>`).join('')

  const html = `
    <main>
      <div class="container">
        <h1 class="page-title">Blog</h1>
        <p class="page-subtitle">${posts.length} post${posts.length !== 1 ? 's' : ''}</p>
        <div class="post-list">${items}</div>
      </div>
    </main>`

  return layout('SomeBlackMagic — Blog', html)
}

export function renderPost(post: Post, bodyHtml: string): string {
  const html = `
    <main>
      <div class="container">
        <a href="/" class="back-link">← All posts</a>
        <header class="article-header">
          <h1 class="article-title">${escHtml(post.title)}</h1>
          <div class="article-meta">
            <time>${post.date}</time>
            ${post.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
          </div>
        </header>
        <div class="article-body">${bodyHtml}</div>
        ${giscusWidget()}
      </div>
    </main>`

  return layout(`${post.title} — SomeBlackMagic`, html)
}

export function renderAbout(): string {
  const html = `
    <main>
      <div class="container">
        <h1 class="page-title">About</h1>
        <div class="article-body" style="margin-top:1.5rem">
          <p>SomeBlackMagic is a personal blog about software engineering, DevOps, and other things.</p>
        </div>
      </div>
    </main>`
  return layout('About — SomeBlackMagic', html)
}

export function render404(): string {
  const html = `
    <main>
      <div class="container">
        <h1 class="page-title">404</h1>
        <p style="color:var(--muted);margin-top:0.5rem">Page not found.</p>
        <a href="/" style="display:inline-block;margin-top:1.5rem">← Back to blog</a>
      </div>
    </main>`
  return layout('404 — SomeBlackMagic', html)
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
