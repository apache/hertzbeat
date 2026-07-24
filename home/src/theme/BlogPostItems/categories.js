export const BLOG_CATEGORIES = [
  {
    id: 'blog.category.releases',
    message: 'Releases',
    slug: 'releases',
  },
  {
    id: 'blog.category.engineering',
    message: 'Engineering',
    slug: 'engineering',
  },
  {
    id: 'blog.category.tutorials',
    message: 'Tutorials',
    slug: 'tutorials',
  },
  {
    id: 'blog.category.community',
    message: 'Community',
    slug: 'community',
  },
]

const CATEGORY_SLUG_PATTERN = BLOG_CATEGORIES.map(category => category.slug).join('|')
const LOCALE_PREFIX_PATTERN = '(?:[a-z]{2}(?:-[a-z]{2})?/)?'

export const CATEGORY_LIST_ROUTE = new RegExp(
    `^/${LOCALE_PREFIX_PATTERN}blog/tags/(?:${CATEGORY_SLUG_PATTERN})(?:/page/\\d+)?/?$`,
    'i',
)

export const BLOG_LIST_ROUTE = new RegExp(
    `^/${LOCALE_PREFIX_PATTERN}blog(?:/page/\\d+|/tags/(?:${CATEGORY_SLUG_PATTERN})(?:/page/\\d+)?)?/?$`,
    'i',
)

export function isCategoryPermalink(permalink) {
  return BLOG_CATEGORIES.some(({slug}) => permalink.endsWith(`/tags/${slug}`))
}
