import type { Post } from './posts-data'
import type { Locale } from './locales'
import { i18n, switchLocaleUrl, LANG_CODE } from './locales'
import { getCategories, type Category } from './categories'

const GISCUS_REPO = 'SomeBlackMagic/someblackmagic-com'
const GISCUS_CATEGORY = 'Announcements'

export interface GiscusConfig {
  repoId: string
  categoryId: string
}

function giscusWidget(locale: Locale, giscus: GiscusConfig): string {
  if (!giscus.repoId || !giscus.categoryId) return ''
  const t = i18n[locale]
  return `
  <section class="comments">
    <h2 class="comments-title">${t.comments}</h2>
    <script src="https://giscus.app/client.js"
      data-repo="${GISCUS_REPO}"
      data-repo-id="${giscus.repoId}"
      data-category="${GISCUS_CATEGORY}"
      data-category-id="${giscus.categoryId}"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="top"
      data-theme="dark"
      data-lang="${locale}"
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

  header { border-bottom: 1px solid var(--border); padding: 1.25rem 0; }
  .container { max-width: 720px; margin: 0 auto; padding: 0 1.5rem; }
  header .container { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  main { padding: 3rem 0; }
  footer { border-top: 1px solid var(--border); padding: 1.5rem 0; color: var(--muted); font-size: 0.85rem; }
  footer .container { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }

  .site-title { font-size: 1.1rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
  .site-title span { color: var(--accent); }

  .header-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  nav { display: flex; gap: 0.25rem; flex-wrap: wrap; }
  nav a {
    color: var(--muted); font-size: 0.85rem;
    padding: 0.3rem 0.65rem; border-radius: 5px; border: 1px solid transparent;
  }
  nav a:hover { color: var(--text); text-decoration: none; }
  nav a.active { color: var(--accent); border-color: var(--border); }

  .lang-switch {
    display: flex; align-items: center;
    border-left: 1px solid var(--border);
    padding-left: 0.75rem;
    margin-left: 0.25rem;
  }
  .lang-switch a {
    color: var(--muted); font-size: 0.8rem; font-weight: 600;
    padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border);
    letter-spacing: 0.03em;
  }
  .lang-switch a:hover { color: var(--text); border-color: var(--accent); text-decoration: none; }

  .page-header { margin-bottom: 2.5rem; }
  .page-title { font-size: 1.9rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.4rem; }
  .page-desc { color: var(--muted); font-size: 0.95rem; }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
  }
  .category-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 1.25rem 1.5rem; display: block; transition: border-color 0.15s;
  }
  .category-card:hover { border-color: var(--accent); text-decoration: none; }
  .category-card-name { font-size: 1.05rem; font-weight: 600; color: var(--text); margin-bottom: 0.35rem; }
  .category-card-desc { color: var(--muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 0.75rem; }
  .category-card-count { color: var(--accent); font-size: 0.8rem; }

  .section-title {
    font-size: 0.75rem; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem;
  }
  .post-list { display: flex; flex-direction: column; }
  .post-item { padding: 1.25rem 0; border-bottom: 1px solid var(--border); }
  .post-item:first-child { border-top: 1px solid var(--border); }
  .post-item-meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem; flex-wrap: wrap; }
  .post-date { color: var(--muted); font-size: 0.82rem; font-variant-numeric: tabular-nums; }
  .post-category-badge {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: 4px; padding: 0.1rem 0.5rem; font-size: 0.75rem; font-weight: 500;
  }
  .tag {
    background: var(--surface); color: var(--muted); border: 1px solid var(--border);
    border-radius: 4px; padding: 0.1rem 0.5rem; font-size: 0.75rem;
  }
  .post-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.3rem; }
  .post-title a { color: var(--text); }
  .post-title a:hover { color: var(--accent); text-decoration: none; }
  .post-desc { color: var(--muted); font-size: 0.875rem; }
  .empty { color: var(--muted); padding: 2rem 0; }

  .article-header { margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
  .article-title { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.75rem; line-height: 1.2; }
  .article-meta { color: var(--muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .article-body { max-width: 65ch; }
  .article-body h1,.article-body h2,.article-body h3,
  .article-body h4,.article-body h5,.article-body h6 {
    font-weight: 600; letter-spacing: -0.02em; margin: 2rem 0 0.75rem; line-height: 1.3;
  }
  .article-body h2 { font-size: 1.4rem; }
  .article-body h3 { font-size: 1.15rem; }
  .article-body p { margin: 1rem 0; }
  .article-body ul,.article-body ol { margin: 1rem 0 1rem 1.5rem; }
  .article-body li { margin: 0.3rem 0; }
  .article-body blockquote {
    border-left: 3px solid var(--accent); margin: 1.5rem 0;
    padding: 0.5rem 1.25rem; color: var(--muted);
  }
  .article-body code {
    background: #161616; border: 1px solid var(--border); border-radius: 4px;
    padding: 0.15em 0.4em; font-size: 0.875em;
    font-family: 'JetBrains Mono','Fira Code',monospace;
  }
  .article-body pre {
    background: #161616; border: 1px solid var(--border); border-radius: 6px;
    padding: 1rem 1.25rem; overflow-x: auto; margin: 1.5rem 0;
  }
  .article-body pre code { background: none; border: none; padding: 0; font-size: 0.875rem; }
  .article-body img { max-width: 100%; border-radius: 6px; margin: 1.5rem 0; }
  .article-body hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
  .back-link { margin-bottom: 2rem; display: inline-block; color: var(--muted); font-size: 0.875rem; }
  .back-link:hover { color: var(--text); text-decoration: none; }
  .comments { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
  .comments-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1.5rem; }
`

function layout(locale: Locale, title: string, content: string, currentPath: string, activeCategory = ''): string {
  const t = i18n[locale]
  const categories = getCategories(locale)

  const navLinks = [
    { href: `/${locale}`, label: t.home, active: !activeCategory && currentPath === `/${locale}` },
    ...categories.map(c => ({
      href: `/${locale}/${c.slug}`,
      label: c.name,
      active: c.slug === activeCategory,
    })),
    { href: `/${locale}/about`, label: t.about, active: currentPath === `/${locale}/about` },
  ]

  const nav = navLinks
    .map(({ href, label, active }) => `<a href="${href}"${active ? ' class="active"' : ''}>${label}</a>`)
    .join('')

  const altUrl = switchLocaleUrl(currentPath, locale)

  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(title)}" />
  <link rel="alternate" hreflang="${LANG_CODE[locale]}" href="${escHtml(currentPath)}" />
  <link rel="alternate" hreflang="${LANG_CODE[locale === 'en' ? 'ua' : 'en']}" href="${escHtml(altUrl)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href="/favicon-96x96.png" sizes="96x96" type="image/png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#0f0f0f" />
  <meta name="msapplication-TileColor" content="#0f0f0f" />
  <meta name="msapplication-TileImage" content="/icon-192x192.png" />
  <style>${CSS}</style>
</head>
<body>
  <header>
    <div class="container">
      <a href="/${locale}" class="site-title">Some<span>BlackMagic</span></a>
      <div class="header-right">
        <nav>${nav}</nav>
        <div class="lang-switch"><a href="${escHtml(altUrl)}">${t.switchLang}</a></div>
      </div>
    </div>
  </header>
  ${content}
  <footer>
    <div class="container">
      <span>© ${new Date().getFullYear()} SomeBlackMagic</span>
      <span>${t.poweredBy}</span>
    </div>
  </footer>
</body>
</html>`
}

export function renderHome(locale: Locale, localePosts: Post[]): string {
  const t = i18n[locale]
  const categories = getCategories(locale)

  const grid = categories.map(cat => {
    const count = localePosts.filter(p => p.category === cat.slug).length
    return `
      <a href="/${locale}/${cat.slug}" class="category-card">
        <div class="category-card-name">${escHtml(cat.name)}</div>
        <div class="category-card-desc">${escHtml(cat.description)}</div>
        <div class="category-card-count">${t.postsCount(count)}</div>
      </a>`
  }).join('')

  const recent = localePosts.slice(0, 5)
  const recentItems = recent.length === 0
    ? `<p class="empty">${t.noPostsYet}</p>`
    : recent.map(p => postItem(p, locale, true)).join('')

  const html = `
    <main>
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">SomeBlackMagic</h1>
          <p class="page-desc">${t.siteDescription}</p>
        </div>
        <div class="category-grid">${grid}</div>
        <p class="section-title">${t.recentPosts}</p>
        <div class="post-list">${recentItems}</div>
      </div>
    </main>`

  return layout(locale, 'SomeBlackMagic', html, `/${locale}`)
}

export function renderCategory(locale: Locale, cat: Category, catPosts: Post[], currentPath: string): string {
  const t = i18n[locale]
  const items = catPosts.length === 0
    ? `<p class="empty">${t.noPostsYet}</p>`
    : catPosts.map(p => postItem(p, locale, false)).join('')

  const html = `
    <main>
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">${escHtml(cat.name)}</h1>
          <p class="page-desc">${escHtml(cat.description)}</p>
        </div>
        <div class="post-list">${items}</div>
      </div>
    </main>`

  return layout(locale, `${cat.name} — SomeBlackMagic`, html, currentPath, cat.slug)
}

export function renderPost(locale: Locale, post: Post, cat: Category, bodyHtml: string, currentPath: string, giscus: GiscusConfig): string {
  const t = i18n[locale]
  const html = `
    <main>
      <div class="container">
        <a href="/${locale}/${post.category}" class="back-link">← ${escHtml(cat.name)}</a>
        <header class="article-header">
          <h1 class="article-title">${escHtml(post.title)}</h1>
          <div class="article-meta">
            <time>${post.date}</time>
            <a href="/${locale}/${post.category}" class="post-category-badge">${escHtml(cat.name)}</a>
            ${post.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
          </div>
        </header>
        <div class="article-body">${bodyHtml}</div>
        ${giscusWidget(locale, giscus)}
      </div>
    </main>`

  return layout(locale, `${post.title} — SomeBlackMagic`, html, currentPath, post.category)
}

export function renderAbout(locale: Locale, currentPath: string): string {
  const t = i18n[locale]

  const aboutContent: Record<Locale, string> = {
    en: '<p>SomeBlackMagic is a personal blog about software engineering, DevOps, and other things.</p>',
    uk: '<p>SomeBlackMagic — особистий блог про інженерію програмного забезпечення, DevOps та інше.</p>',
  }

  const html = `
    <main>
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">${t.about}</h1>
        </div>
        <div class="article-body">${aboutContent[locale]}</div>
      </div>
    </main>`

  return layout(locale, `${t.about} — SomeBlackMagic`, html, currentPath)
}

export function render404(locale: Locale): string {
  const t = i18n[locale]
  const html = `
    <main>
      <div class="container">
        <h1 class="page-title">${t.notFound}</h1>
        <p style="color:var(--muted);margin-top:0.5rem">${t.notFoundDesc}</p>
        <a href="/${locale}" style="display:inline-block;margin-top:1.5rem">${t.backToHome}</a>
      </div>
    </main>`
  return layout(locale, `${t.notFound} — SomeBlackMagic`, html, `/${locale}`)
}

function postItem(p: Post, locale: Locale, showCategory: boolean): string {
  const categories = getCategories(locale)
  const cat = categories.find(c => c.slug === p.category)
  const catBadge = showCategory && cat
    ? `<a href="/${locale}/${p.category}" class="post-category-badge">${escHtml(cat.name)}</a>`
    : ''
  return `
    <article class="post-item">
      <div class="post-item-meta">
        <time class="post-date">${p.date}</time>
        ${catBadge}
        ${p.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
      </div>
      <h2 class="post-title"><a href="/${locale}/${p.category}/${p.slug}">${escHtml(p.title)}</a></h2>
      ${p.description ? `<p class="post-desc">${escHtml(p.description)}</p>` : ''}
    </article>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
