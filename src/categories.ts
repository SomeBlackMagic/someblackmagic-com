import type { Locale } from './locales'

export interface Category {
  slug: string
  name: string
  description: string
  /** Longer text for <meta name="description">; falls back to description */
  metaDescription?: string
}

const CATEGORY_DEFS: Record<string, Record<Locale, Omit<Category, 'slug'>>> = {
  iot: {
    en: { name: 'IoT', description: 'Sensors, Home Assistant and home automation', metaDescription: 'Posts about IoT: sensors, Home Assistant and home automation — setups, integrations and practical notes.' },
    ua: { name: 'IoT', description: 'Датчики, Home Assistant та домашня автоматизація', metaDescription: 'Пости про IoT: датчики, Home Assistant і домашня автоматизація — налаштування, інтеграції та практичні нотатки.' },
  },
  saltstack: {
    en: { name: 'SaltStack', description: 'Configuration management and infrastructure automation' },
    ua: { name: 'SaltStack', description: 'Управління конфігураціями та автоматизація інфраструктури' },
  },
  kubernetes: {
    en: { name: 'Kubernetes', description: 'Container orchestration and cloud-native', metaDescription: 'Posts about Kubernetes: container orchestration, cluster operations and cloud-native tooling in practice.' },
    ua: { name: 'Kubernetes', description: 'Оркестрація контейнерів та cloud-native', metaDescription: 'Пости про Kubernetes: оркестрація контейнерів, експлуатація кластерів і cloud-native інструменти на практиці.' },
  },
  blog: {
    en: { name: 'Blog', description: 'Everything else', metaDescription: 'Everything else from SomeBlackMagic: blog news, personal notes and posts that don\'t fit into IoT, SaltStack or Kubernetes.' },
    ua: { name: 'Блог', description: 'Все інше', metaDescription: 'Все інше від SomeBlackMagic: новини блогу, особисті нотатки та пости, що не вписуються в IoT, SaltStack чи Kubernetes.' },
  },
}

export const CATEGORY_SLUGS = Object.keys(CATEGORY_DEFS)
export const CATEGORY_SLUG_SET = new Set(CATEGORY_SLUGS)

export function getCategories(locale: Locale): Category[] {
  return CATEGORY_SLUGS.map(slug => ({ slug, ...CATEGORY_DEFS[slug][locale] }))
}

export function getCategory(slug: string, locale: Locale): Category | undefined {
  if (!CATEGORY_DEFS[slug]) return undefined
  return { slug, ...CATEGORY_DEFS[slug][locale] }
}
