import { Hono } from 'hono'
import { marked } from 'marked'
import { posts } from './posts-data'
import { renderIndex, renderPost, renderAbout, render404 } from './template'

const app = new Hono()

app.get('/', (c) => c.html(renderIndex(posts)))

app.get('/about', (c) => c.html(renderAbout()))

app.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug')
  const post = posts.find(p => p.slug === slug)
  if (!post) return c.html(render404(), 404)
  const bodyHtml = await marked.parse(post.content)
  return c.html(renderPost(post, bodyHtml))
})

app.notFound((c) => c.html(render404(), 404))

export default app
