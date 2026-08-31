import fs from 'fs'
import path from 'path'

const VALID_LOCALES = ['en', 'ua']
const VALID_CATEGORIES = ['iot', 'saltstack', 'kubernetes', 'blog']

const [, , locale, category, ...titleParts] = process.argv
const title = titleParts.join(' ')

if (!locale || !category || !title) {
  console.error('Usage: npm run new-post <locale> <category> "Post Title"')
  console.error(`Locales:     ${VALID_LOCALES.join(', ')}`)
  console.error(`Categories:  ${VALID_CATEGORIES.join(', ')}`)
  process.exit(1)
}

if (!VALID_LOCALES.includes(locale)) {
  console.error(`Unknown locale "${locale}". Valid: ${VALID_LOCALES.join(', ')}`)
  process.exit(1)
}

if (!VALID_CATEGORIES.includes(category)) {
  console.error(`Unknown category "${category}". Valid: ${VALID_CATEGORIES.join(', ')}`)
  process.exit(1)
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
  .replace(/^-|-$/g, '')

const date = new Date().toISOString().slice(0, 10)
const dir = path.join('./content/posts', locale, category)
const file = path.join(dir, `${date}-${slug}.md`)

const template = `---
title: ${title}
date: ${date}
description:
tags:
---

Write your post here.
`

fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(file, template)
console.log(`Created: ${file}`)
