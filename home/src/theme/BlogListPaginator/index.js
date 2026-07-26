import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import {translate} from '@docusaurus/Translate'
import {rememberBlogListScrollPosition} from '@site/plugins/blogFeaturedPosts/scrollPosition'

import styles from './styles.module.css'

// Page 1 lives at the blog base path, later pages at <base>/page/<n>.
function useHrefBuilder(metadata) {
  const {permalink, page} = metadata
  const base = page === 1 ? permalink : permalink.replace(/\/page\/\d+$/, '')
  return n => (n === 1 ? base : `${base}/page/${n}`)
}

// Window of pages around the current one, with ellipsis gaps: 1 … 4 [5] 6 … 12
function pageItems(current, total) {
  if (total <= 7) {
    return Array.from({length: total}, (_, i) => i + 1)
  }
  const around = [current - 1, current, current + 1].filter(n => n > 1 && n < total)
  const items = [1, ...around, total]
  const result = []
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && items[i] - items[i - 1] > 1) {
      result.push({gap: true, key: `gap-${items[i]}`})
    }
    result.push(items[i])
  }
  return result
}

export default function BlogListPaginator({metadata}) {
  const {page, totalPages, previousPage, nextPage} = metadata
  const hrefFor = useHrefBuilder(metadata)

  if (!totalPages || totalPages <= 1) {
    return null
  }

  const prevLabel = translate({
    id: 'theme.blog.paginator.newerEntries',
    message: 'Newer entries',
  })
  const nextLabel = translate({
    id: 'theme.blog.paginator.olderEntries',
    message: 'Older entries',
  })

  return (
      <nav
          className={styles.paginator}
          aria-label={translate({
            id: 'theme.blog.paginator.navAriaLabel',
            message: 'Blog list page navigation',
          })}
      >
        {previousPage ? (
            <Link
                className={styles.arrow}
                to={previousPage}
                aria-label={prevLabel}
                onClick={rememberBlogListScrollPosition}
            >
              ‹
            </Link>
        ) : (
            <span className={clsx(styles.arrow, styles.disabled)} aria-hidden="true">
              ‹
            </span>
        )}

        {pageItems(page, totalPages).map(item =>
            typeof item === 'object' ? (
                <span key={item.key} className={styles.gap}>
                  …
                </span>
            ) : (
                <Link
                    key={item}
                    to={hrefFor(item)}
                    className={clsx(styles.page, item === page && styles.current)}
                    aria-current={item === page ? 'page' : undefined}
                    onClick={rememberBlogListScrollPosition}
                >
                  {item}
                </Link>
            ),
        )}

        {nextPage ? (
            <Link
                className={styles.arrow}
                to={nextPage}
                aria-label={nextLabel}
                onClick={rememberBlogListScrollPosition}
            >
              ›
            </Link>
        ) : (
            <span className={clsx(styles.arrow, styles.disabled)} aria-hidden="true">
              ›
            </span>
        )}
      </nav>
  )
}
