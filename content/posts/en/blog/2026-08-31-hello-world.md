---
title: Hello World
date: 2026-08-31
description: The first post on SomeBlackMagic blog.
tags: meta
---

Welcome to **SomeBlackMagic** — a blog about software engineering, DevOps, and whatever else seems interesting.

## What to expect

- Deep dives into infrastructure and automation
- Notes on tools and workflows that actually work
- Occasional rants about things that don't

## Stack

This blog runs on [Cloudflare Workers](https://workers.cloudflare.com/) with zero cold starts, zero servers, and close to zero cost.

```ts
export default {
  fetch(request: Request) {
    return new Response('Hello from the edge!')
  }
}
```

Stay tuned.
