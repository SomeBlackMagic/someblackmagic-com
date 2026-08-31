// URL slugs: /en/... and /ua/...
export const LOCALES = ['en', 'ua'] as const
export type Locale = typeof LOCALES[number]
export const LOCALE_SET = new Set<string>(LOCALES)

export const DEFAULT_LOCALE: Locale = 'en'

// ISO 639-1 language codes used in <html lang> and hreflang
// 'ua' is the country code — the correct language code for Ukrainian is 'uk'
export const LANG_CODE: Record<Locale, string> = {
  en: 'en',
  ua: 'uk',
}

interface I18n {
  htmlLang: string
  home: string
  about: string
  recentPosts: string
  noPostsYet: string
  poweredBy: string
  notFound: string
  notFoundDesc: string
  backToHome: string
  comments: string
  postsCount: (n: number) => string
  siteDescription: string
  switchLang: string
}

export const i18n: Record<Locale, I18n> = {
  en: {
    htmlLang: 'en',
    home: 'Home',
    about: 'About',
    recentPosts: 'Recent posts',
    noPostsYet: 'No posts yet.',
    poweredBy: 'Powered by Cloudflare Workers',
    notFound: '404',
    notFoundDesc: 'Page not found.',
    backToHome: '← Back to home',
    comments: 'Comments',
    postsCount: (n) => `${n} post${n !== 1 ? 's' : ''}`,
    siteDescription: 'Notes on IoT, SaltStack, Kubernetes, and everything else.',
    switchLang: 'UA',
  },
  ua: {
    htmlLang: 'uk',
    home: 'Головна',
    about: 'Про мене',
    recentPosts: 'Останні пости',
    noPostsYet: 'Постів ще немає.',
    poweredBy: 'Працює на Cloudflare Workers',
    notFound: '404',
    notFoundDesc: 'Сторінку не знайдено.',
    backToHome: '← На головну',
    comments: 'Коментарі',
    postsCount: (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'пост' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пости' : 'постів'}`,
    siteDescription: 'Нотатки про IoT, SaltStack, Kubernetes та інше.',
    switchLang: 'EN',
  },
}

/** Detect locale from Accept-Language header value */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const parts = acceptLanguage.toLowerCase().split(',').map(p => p.split(';')[0].trim())
  for (const part of parts) {
    if (part === 'uk' || part.startsWith('uk-')) return 'ua'
    if (part === 'en' || part.startsWith('en-')) return 'en'
  }
  return DEFAULT_LOCALE
}

/** Switch locale: /en/foo → /ua/foo */
export function switchLocaleUrl(currentPath: string, currentLocale: Locale): string {
  const other: Locale = currentLocale === 'en' ? 'ua' : 'en'
  return `/${other}${currentPath.slice(`/${currentLocale}`.length) || ''}`
}
