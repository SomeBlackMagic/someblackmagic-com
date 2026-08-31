import type { Locale } from './locales'

export interface Category {
  slug: string
  name: string
  description: string
}

const CATEGORY_DEFS: Record<string, Record<Locale, Omit<Category, 'slug'>>> = {
  iot: {
    en: { name: 'IoT', description: 'Sensors, Home Assistant and home automation' },
    uk: { name: 'IoT', description: 'Датчики, Home Assistant та домашня автоматизація' },
  },
  saltstack: {
    en: { name: 'SaltStack', description: 'Configuration management and infrastructure automation' },
    uk: { name: 'SaltStack', description: 'Управління конфігураціями та автоматизація інфраструктури' },
  },
  kubernetes: {
    en: { name: 'Kubernetes', description: 'Container orchestration and cloud-native' },
    uk: { name: 'Kubernetes', description: 'Оркестрація контейнерів та cloud-native' },
  },
  blog: {
    en: { name: 'Blog', description: 'Everything else' },
    uk: { name: 'Блог', description: 'Все інше' },
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
