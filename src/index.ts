import { Hono } from 'hono'
import { marked } from 'marked'
import { posts } from './posts-data'
import { LOCALES, LOCALE_SET, detectLocale, type Locale, LANG_CODE } from './locales'
import { CATEGORY_SLUGS, CATEGORY_SLUG_SET, getCategory } from './categories'
import { renderHome, renderCategory, renderPost, renderAbout, render404 } from './template'

const SITE_URL = 'https://someblackmagic.com'

const app = new Hono()

// Root: detect locale and redirect
app.get('/', (c) => {
  const locale = detectLocale(c.req.header('Accept-Language') ?? null)
  return c.redirect(`/${locale}`, 302)
})

function parseLocale(raw: string): Locale | null {
  return LOCALE_SET.has(raw) ? (raw as Locale) : null
}

// Sitemap
app.get('/sitemap.xml', (c) => {
  const urls: string[] = []

  for (const locale of LOCALES) {
    urls.push(`${SITE_URL}/${locale}`)
    urls.push(`${SITE_URL}/${locale}/about`)
    for (const cat of CATEGORY_SLUGS) {
      urls.push(`${SITE_URL}/${locale}/${cat}`)
    }
  }

  for (const post of posts) {
    urls.push(`${SITE_URL}/${post.locale}/${post.category}/${post.slug}`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(url => `  <url>
    <loc>${url}</loc>
  </url>`).join('\n')}
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
  return c.html(renderPost(locale, post, cat, bodyHtml, c.req.path))
})

app.notFound((c) => {
  const locale = parseLocale(c.req.path.split('/')[1]) ?? 'en'
  return c.html(render404(locale), 404)
})

export default app
