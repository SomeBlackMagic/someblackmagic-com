import fs from 'fs'
import path from 'path'

const title = process.argv[2]
if (!title) {
  console.error('Usage: npm run new-post "My Post Title"')
  process.exit(1)
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const date = new Date().toISOString().slice(0, 10)
const file = path.join('./content/posts', `${date}-${slug}.md`)

const template = `---
title: ${title}
date: ${date}
description:
tags:
---

Write your post here.
`

fs.mkdirSync('./content/posts', { recursive: true })
fs.writeFileSync(file, template)
console.log(`Created: ${file}`)
