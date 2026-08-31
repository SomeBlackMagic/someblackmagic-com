import { Hono } from 'hono'
import { marked } from 'marked'
import { posts } from './posts-data'
import { LOCALE_SET, detectLocale, type Locale } from './locales'
import { CATEGORY_SLUG_SET, getCategory } from './categories'
import { renderHome, renderCategory, renderPost, renderAbout, render404, type GiscusConfig } from './template'

type Env = {
  Bindings: {
    GISCUS_REPO_ID?: string
    GISCUS_CATEGORY_ID?: string
  }
}

const app = new Hono<Env>()

// Temporary debug route — remove after debugging
app.get('/_debug/env', (c) => {
  return c.json({
    GISCUS_REPO_ID: c.env.GISCUS_REPO_ID ? `set (${c.env.GISCUS_REPO_ID.length} chars)` : 'MISSING',
    GISCUS_CATEGORY_ID: c.env.GISCUS_CATEGORY_ID ? `set (${c.env.GISCUS_CATEGORY_ID.length} chars)` : 'MISSING',
  })
})

// Root: detect locale and redirect
app.get('/', (c) => {
  const locale = detectLocale(c.req.header('Accept-Language') ?? null)
  return c.redirect(`/${locale}`, 302)
})

function parseLocale(raw: string): Locale | null {
  return LOCALE_SET.has(raw) ? (raw as Locale) : null
}

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
  const giscus: GiscusConfig = {
    repoId: c.env.GISCUS_REPO_ID ?? '',
    categoryId: c.env.GISCUS_CATEGORY_ID ?? '',
  }
  return c.html(renderPost(locale, post, cat, bodyHtml, c.req.path, giscus))
})

app.notFound((c) => {
  const locale = parseLocale(c.req.path.split('/')[1]) ?? 'en'
  return c.html(render404(locale), 404)
})

export default app
