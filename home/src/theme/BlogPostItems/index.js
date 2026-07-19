import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import {translate} from '@docusaurus/Translate'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import {usePluginData} from '@docusaurus/useGlobalData'
import {useLocation} from '@docusaurus/router'

import {
  BLOG_CATEGORIES,
  BLOG_LIST_ROUTE,
  CATEGORY_LIST_ROUTE,
  isCategoryPermalink,
} from './categories'
import {rememberBlogListScrollPosition} from '@site/plugins/blogFeaturedPosts/scrollPosition'
import styles from './styles.module.css'

const COVER_CAPTION_FALLBACK = 'Apache HertzBeat'

// Accent pairs for the generated cover, matching the palette of the hand-made
// cover images so both styles sit together on the same page.
const COVER_ACCENTS = [
  ['#a86ee0', '#7fb5e8'],
  ['#6fc7b4', '#8fb8ee'],
  ['#e0a86e', '#c48fe8'],
  ['#7f9ce8', '#b98fe0'],
  ['#e08fb5', '#8fc4e8'],
]

// Hashed on the locale-independent part of the permalink, so a post keeps its
// accents across rebuilds and looks the same on every locale.
function pickAccents(permalink) {
  const blogIndex = permalink.indexOf('/blog/')
  const key = blogIndex === -1 ? permalink : permalink.slice(blogIndex)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return COVER_ACCENTS[Math.abs(hash) % COVER_ACCENTS.length]
}

// Monitored targets are buried in long titles and appear nowhere else on the
// card, so surfacing them is what makes covers differ from one another. These
// are product names, deliberately left untranslated.
const MONITORED_TARGETS = [
  ['Kubernetes', /\bk8s\b|kubernetes/i],
  ['IoTDB', /iotdb/i],
  ['Apache ShenYu', /shenyu/i],
  ['DynamicTp', /dynamictp/i],
  ['GreptimeDB', /greptime/i],
  ['SpringBoot', /spring\s*boot/i],
  ['Linux', /\blinux\b/i],
  ['SSL Certificate', /ssl\s*(certificate|证书)/i],
  ['MySQL', /mysql/i],
  ['PostgreSQL', /postgres/i],
  ['Redis', /\bredis\b/i],
  ['Nacos', /nacos/i],
  ['Prometheus', /prometheus/i],
  ['Docker', /\bdocker\b/i],
  ['Windows', /\bwindows\b/i],
]

// One short line under the logo, rather than repeating the post title. The
// wording comes from the category label so it follows tags.yml translations;
// a version or monitored target is appended when the post has one.
function coverCaption(title, tags, category) {
  const haystack = `${title} ${tags.map(t => t.label).join(' ')}`
  const label = category?.label

  // Titles carry either "v1.0" or a bare "1.7.0"; only the prefixed form may
  // omit the patch number, so a bare "1.5" stays unmatched.
  const version =
      haystack.match(/\bv(\d+\.\d+(?:\.\d+)?)\b/i) || haystack.match(/\b(\d+\.\d+\.\d+)\b/)
  const target = MONITORED_TARGETS.find(([, pattern]) => pattern.test(haystack))
  const detail = version ? `v${version[1]}` : target?.[0]

  if (label && detail) {
    return `${label} · ${detail}`
  }
  return label ?? detail ?? COVER_CAPTION_FALLBACK
}

const HERO_SIDE_COUNT = 3

function useDateFormatter() {
  const {i18n} = useDocusaurusContext()
  return dateString => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return dateString
    }
    try {
      return new Intl.DateTimeFormat(i18n.currentLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date)
    } catch {
      return dateString
    }
  }
}

function Meta({date, authorNames, formatDate}) {
  return (
      <div className={styles.meta}>
        <time dateTime={date}>{formatDate(date)}</time>
        {authorNames.length > 0 && (
            <span className={styles.metaSeparator}>{authorNames.join(', ')}</span>
        )}
      </div>
  )
}

function Cover({image, title, tags, category, permalink, className}) {
  const imageUrl = useBaseUrl(image ?? '')
  const brandUrl = useBaseUrl('/img/hertzbeat-brand.svg')
  const brandWhiteUrl = useBaseUrl('/img/hertzbeat-brand-white.svg')

  if (image) {
    return (
        <div className={clsx(styles.cover, className)}>
          <img className={styles.coverImage} src={imageUrl} alt="" loading="lazy" />
        </div>
    )
  }

  const [accent, accent2] = pickAccents(permalink)

  return (
      <div
          className={clsx(styles.cover, styles.coverGenerated, className)}
          style={{'--cover-accent': accent, '--cover-accent-2': accent2}}
      >
        <span className={clsx(styles.coverGlow, styles.coverGlowStart)} />
        <span className={clsx(styles.coverGlow, styles.coverGlowEnd)} />
        <img
            className={clsx(styles.coverBrand, styles.coverBrandLight)}
            src={brandUrl}
            alt=""
            loading="lazy"
        />
        <img
            className={clsx(styles.coverBrand, styles.coverBrandDark)}
            src={brandWhiteUrl}
            alt=""
            loading="lazy"
        />
        <span className={styles.coverCaption}>{coverCaption(title, tags, category)}</span>
      </div>
  )
}

function getCardData(content) {
  const {metadata, frontMatter, assets} = content
  const category = (metadata.tags ?? []).find(tag => isCategoryPermalink(tag.permalink))
  return {
    ...metadata,
    image: assets?.image ?? frontMatter?.image,
    authorNames: (metadata.authors ?? []).map(a => a.name).filter(Boolean),
    category,
  }
}

function BlogCard({content, formatDate}) {
  const d = getCardData(content)

  return (
      <article className={styles.card}>
        <Link to={d.permalink} className={styles.cardLink}>
          <Cover
              image={d.image}
              title={d.title}
              tags={d.tags}
              category={d.category}
              permalink={d.permalink}
          />
          <div className={styles.body}>
            {d.tags.length > 0 && (
                <div className={styles.tags}>
                  {d.tags.slice(0, 3).map(tag => (
                      <span key={tag.permalink} className={styles.tag}>
                        {tag.label}
                      </span>
                  ))}
                </div>
            )}
            <h2 className={styles.title}>{d.title}</h2>
            {d.description && <p className={styles.description}>{d.description}</p>}
            <Meta {...d} formatDate={formatDate} />
          </div>
        </Link>
      </article>
  )
}

function HeroCard({content, formatDate}) {
  const d = getCardData(content)

  return (
      <article className={clsx(styles.card, styles.heroCard)}>
        <Link to={d.permalink} className={styles.cardLink}>
          <Cover
              image={d.image}
              title={d.title}
              tags={d.tags}
              category={d.category}
              permalink={d.permalink}
              className={styles.heroCover}
          />
          <div className={styles.body}>
            <h2 className={clsx(styles.title, styles.heroTitle)}>{d.title}</h2>
            {d.description && (
                <p className={clsx(styles.description, styles.heroDescription)}>
                  {d.description}
                </p>
            )}
            <Meta {...d} formatDate={formatDate} />
          </div>
        </Link>
      </article>
  )
}

function SideCard({content, formatDate}) {
  const d = getCardData(content)

  return (
      <article className={clsx(styles.card, styles.sideCard)}>
        <Link to={d.permalink} className={styles.sideLink}>
          <h3 className={styles.sideTitle}>{d.title}</h3>
          {d.description && <p className={styles.sideDescription}>{d.description}</p>}
          <Meta {...d} formatDate={formatDate} />
        </Link>
      </article>
  )
}

function CategoryBar({compact = false}) {
  const {pathname} = useLocation()
  const blogBasePath = useBaseUrl('/blog/', {forcePrependBaseUrl: true})
  const allActive = !CATEGORY_LIST_ROUTE.test(pathname)

  return (
      <nav
          className={clsx(styles.categoryBar, {[styles.categoryBarCompact]: compact})}
          aria-label={translate({
            id: 'blog.category.navigation',
            message: 'Blog categories',
            description: 'Accessible label for the blog category navigation',
          })}
      >
        <Link
            to={blogBasePath}
            className={clsx(styles.categoryPill, {
              [styles.categoryPillActive]: allActive,
            })}
            aria-current={allActive ? 'page' : undefined}
            onClick={rememberBlogListScrollPosition}
        >
          {translate({
            id: 'blog.category.all',
            message: 'All',
            description: 'Label of the category filter showing every blog post',
          })}
        </Link>
        {BLOG_CATEGORIES.map(category => {
          const active = pathname.includes(`/blog/tags/${category.slug}`)
          return (
            <Link
                key={category.id}
                to={`${blogBasePath}tags/${category.slug}/`}
                className={clsx(styles.categoryPill, {
                  [styles.categoryPillActive]: active,
                })}
                aria-current={active ? 'page' : undefined}
                onClick={rememberBlogListScrollPosition}
            >
              {translate({id: category.id, message: category.message})}
            </Link>
          )
        })}
      </nav>
  )
}

export default function BlogPostItems({items}) {
  const {pathname} = useLocation()
  const {posts: featuredPosts = []} = usePluginData('blog-featured-posts')
  const formatDate = useDateFormatter()
  const isListPage = BLOG_LIST_ROUTE.test(pathname)
  const withHero = isListPage && featuredPosts.length > HERO_SIDE_COUNT

  // Featured posts stay in the grid below, so every page keeps full rows.
  const hero = withHero ? featuredPosts[0] : null
  const side = withHero ? featuredPosts.slice(1, 1 + HERO_SIDE_COUNT) : []

  return (
      <>
        {hero && (
            <div className={styles.heroSection}>
              <HeroCard content={hero} formatDate={formatDate} />
              <div className={styles.sideList}>
                {side.map(content => (
                    <SideCard
                        key={content.metadata.permalink}
                        content={content}
                        formatDate={formatDate}
                    />
                ))}
              </div>
            </div>
        )}

        {isListPage && <CategoryBar compact={!withHero} />}

        <div className={styles.blogGrid}>
          {items.map(({content}) => (
              <BlogCard
                  key={content.metadata.permalink}
                  content={content}
                  formatDate={formatDate}
              />
          ))}
        </div>
      </>
  )
}
