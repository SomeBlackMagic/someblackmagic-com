import { Hono } from 'hono'
import { marked } from 'marked'
import { posts } from './posts-data'
import { LOCALES, LOCALE_SET, LANG_CODE, detectLocale, type Locale } from './locales'
import { CATEGORY_SLUGS, CATEGORY_SLUG_SET, getCategory } from './categories'
import { renderHome, renderCategory, renderPost, renderAbout, render404, type GiscusConfig } from './template'

const SITE_URL = 'https://someblackmagic.com'

type Bindings = {
  GISCUS_REPO?: string
  GISCUS_REPO_ID?: string
  GISCUS_CATEGORY?: string
  GISCUS_CATEGORY_ID?: string
}

function giscusConfig(env: Bindings): GiscusConfig | null {
  const { GISCUS_REPO, GISCUS_REPO_ID, GISCUS_CATEGORY, GISCUS_CATEGORY_ID } = env
  if (!GISCUS_REPO || !GISCUS_REPO_ID || !GISCUS_CATEGORY || !GISCUS_CATEGORY_ID) return null
  return { repo: GISCUS_REPO, repoId: GISCUS_REPO_ID, category: GISCUS_CATEGORY, categoryId: GISCUS_CATEGORY_ID }
}

const app = new Hono<{ Bindings: Bindings }>()

const CANONICAL_HOST = new URL(SITE_URL).host
const SITE_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`])

// Canonicalize URLs: http -> https, www -> apex, strip trailing slash.
// Pages declare https://someblackmagic.com/... as canonical; serving other
// variants with 200 makes search engines report them as "alternate page with
// proper canonical tag" instead of consolidating on the canonical URL.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  if (SITE_HOSTS.has(url.hostname)) {
    const forwardedProto = c.req.header('X-Forwarded-Proto')
    const isHttp = url.protocol === 'http:' || forwardedProto === 'http'
    const path = url.pathname.length > 1 && url.pathname.endsWith('/')
      ? url.pathname.replace(/\/+$/, '') || '/'
      : url.pathname
    if (isHttp || url.hostname !== CANONICAL_HOST || path !== url.pathname) {
      return c.redirect(`${SITE_URL}${path}${url.search}`, 301)
    }
  }
  await next()
  if (SITE_HOSTS.has(url.hostname)) {
    c.header('Strict-Transport-Security', 'max-age=31536000')
  }
})

// Legacy URLs (earlier site structures / renamed posts) -> current canonical URLs.
// Without these, previously crawled URLs end up as 404 in Search Console.
const RENAMED_PATHS: Record<string, string> = {
  '/ua/saltstack/2026-11-01-saltstack-plugin-2026-2-4': '/ua/saltstack/2026-11-01-saltstack-plugin-2026-3-0',
  '/en/saltstack/2026-10-17-jinja2-enhanced-20206-3-2': '/en/saltstack/2026-10-17-jinja2-enhanced-2026-3-2',
  '/ua/saltstack/2026-10-17-jinja2-enhanced-20206-3-2': '/ua/saltstack/2026-10-17-jinja2-enhanced-2026-3-2',
}

app.use('*', async (c, next) => {
  const path = c.req.path
  const search = new URL(c.req.url).search
  let target: string | undefined = RENAMED_PATHS[path]
  if (!target && (path === '/uk' || path.startsWith('/uk/'))) {
    target = '/ua' + path.slice(3)
    target = RENAMED_PATHS[target] ?? target
  }
  if (!target && path === '/about') target = '/en/about'
  if (!target) {
    const m = path.match(/^\/blog\/([^/]+)$/)
    if (m) target = `/en/blog/${m[1]}`
  }
  if (target) return c.redirect(`${SITE_URL}${target}${search}`, 301)
  await next()
})

// Root: detect locale and redirect
app.get('/', (c) => {
  const locale = detectLocale(c.req.header('Accept-Language') ?? null)
  return c.redirect(`/${locale}`, 302)
})

function parseLocale(raw: string): Locale | null {
  return LOCALE_SET.has(raw) ? (raw as Locale) : null
}

// Sitemap (with hreflang alternates for translated pages)
app.get('/sitemap.xml', (c) => {
  // Each entry: list of [locale, path] variants of the same page
  const groups: Array<Array<[Locale, string]>> = []

  groups.push(LOCALES.map(l => [l, `/${l}`]))
  groups.push(LOCALES.map(l => [l, `/${l}/about`]))
  for (const cat of CATEGORY_SLUGS) {
    groups.push(LOCALES.map(l => [l, `/${l}/${cat}`]))
  }

  const seen = new Set<typeof posts[number]>()
  for (const post of posts) {
    if (seen.has(post)) continue
    const variants = posts.filter(p => p === post || (p.translationKey === post.translationKey && p.locale !== post.locale))
    const group: Array<[Locale, string]> = []
    for (const p of variants) {
      if (group.some(([l]) => l === p.locale)) continue
      seen.add(p)
      group.push([p.locale as Locale, `/${p.locale}/${p.category}/${p.slug}`])
    }
    groups.push(group)
  }

  const entries: string[] = []
  for (const group of groups) {
    const alternates = group.length > 1
      ? [
          ...group.map(([l, path]) => `    <xhtml:link rel="alternate" hreflang="${LANG_CODE[l]}" href="${SITE_URL}${path}" />`),
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${(group.find(([l]) => l === 'en') ?? group[0])[1]}" />`,
        ]
      : []
    for (const [, path] of group) {
      entries.push(['  <url>', `    <loc>${SITE_URL}${path}</loc>`, ...alternates, '  </url>'].join('\n'))
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

app.get('/:locale', (c) => {
  const locale = parseLocale(c.req.param('locale'))
  if (!locale) return c.html(render404('en'), 404)
  const localePosts = posts.filter(p => p.locale === locale)
  return c.html(renderHome(locale, localePosts))
})

app.get('/:locale/about', (c) => {
  const locale = parseLocale(c.req.param('locale'))
  if (!locale) return c.html(render404('en'), 404)
  return c.html(renderAbout(locale, c.req.path))
})

app.get('/:locale/:category', (c) => {
  const locale = parseLocale(c.req.param('locale'))
  if (!locale) return c.html(render404('en'), 404)
  const categorySlug = c.req.param('category')
  if (!CATEGORY_SLUG_SET.has(categorySlug)) return c.html(render404(locale), 404)
  const cat = getCategory(categorySlug, locale)!
  const catPosts = posts.filter(p => p.locale === locale && p.category === categorySlug)
  return c.html(renderCategory(locale, cat, catPosts, c.req.path))
})

app.get('/:locale/:category/:slug', async (c) => {
  const locale = parseLocale(c.req.param('locale'))
  if (!locale) return c.html(render404('en'), 404)
  const categorySlug = c.req.param('category')
  const postSlug = c.req.param('slug')
  if (!CATEGORY_SLUG_SET.has(categorySlug)) return c.html(render404(locale), 404)
  const post = posts.find(p => p.locale === locale && p.category === categorySlug && p.slug === postSlug)
  if (!post) return c.html(render404(locale), 404)
  const cat = getCategory(categorySlug, locale)!
  const bodyHtml = await marked.parse(post.content)
  const translation = posts.find(p => p.locale !== locale && p.translationKey === post.translationKey)
  const altPath = translation ? `/${translation.locale}/${translation.category}/${translation.slug}` : null
  return c.html(renderPost(locale, post, cat, bodyHtml, c.req.path, altPath, giscusConfig(c.env)))
})

app.notFound((c) => {
  const locale = parseLocale(c.req.path.split('/')[1]) ?? 'en'
  return c.html(render404(locale), 404)
})

export default app
