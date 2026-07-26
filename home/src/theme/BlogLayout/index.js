import React from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import BlogSidebar from '@theme/BlogSidebar'
import {translate} from '@docusaurus/Translate'
import {useLocation} from '@docusaurus/router'

import {BLOG_LIST_ROUTE} from '../BlogPostItems/categories'
import styles from './styles.module.css'

// Main and category listings share the same page shell. Other tag and author
// pages keep their headings from the default Docusaurus theme.
export default function BlogLayout(props) {
  const {sidebar, toc, children, ...layoutProps} = props
  const {pathname} = useLocation()
  const hasSidebar = sidebar && sidebar.items.length > 0
  const isListPage = BLOG_LIST_ROUTE.test(pathname)

  return (
      <Layout {...layoutProps}>
        <div className={clsx({[styles.listSurface]: isListPage})}>
          <div
              className={clsx('container', styles.blogContainer, {
                'margin-vert--lg': !isListPage,
                [styles.blogListContainer]: isListPage,
              })}
          >
            {isListPage && (
                <header className={styles.pageHeader}>
                  <h1 className={styles.pageTitle}>
                    {translate({
                      id: 'blog.page.title',
                      message: 'Blog',
                      description: 'Heading shown at the top of the blog list page',
                    })}
                  </h1>
                </header>
            )}
            <div className="row">
              <BlogSidebar sidebar={sidebar} />
              <main
                  className={clsx('col', {
                    'col--7': hasSidebar,
                    'col--9 col--offset-1': !hasSidebar && !isListPage,
                    'col--12': !hasSidebar && isListPage,
                  })}
              >
                {children}
              </main>
              {toc && <div className="col col--2">{toc}</div>}
            </div>
          </div>
        </div>
      </Layout>
  )
}
