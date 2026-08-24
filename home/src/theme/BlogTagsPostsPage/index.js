import React from 'react'
import clsx from 'clsx'
import {translate} from '@docusaurus/Translate'
import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
} from '@docusaurus/theme-common'
import OriginalBlogTagsPostsPage from '@theme-original/BlogTagsPostsPage'
import BlogLayout from '@theme/BlogLayout'
import BlogListPaginator from '@theme/BlogListPaginator'
import BlogPostItems from '@theme/BlogPostItems'
import SearchMetadata from '@theme/SearchMetadata'
import Unlisted from '@theme/ContentVisibility/Unlisted'

import {isCategoryPermalink} from '../BlogPostItems/categories'

function CategoryPostsPage({tag, items, sidebar, listMetadata}) {
  const blogTitle = translate({
    id: 'blog.page.title',
    message: 'Blog',
    description: 'Heading shown at the top of the blog list page',
  })

  return (
      <HtmlClassNameProvider
          className={clsx(
              ThemeClassNames.wrapper.blogPages,
              ThemeClassNames.page.blogTagPostListPage,
          )}
      >
        <PageMetadata title={`${tag.label} | ${blogTitle}`} description={tag.description} />
        <SearchMetadata tag="blog_tags_posts" />
        <BlogLayout sidebar={sidebar}>
          {tag.unlisted && <Unlisted />}
          <BlogPostItems items={items} />
          <BlogListPaginator metadata={listMetadata} />
        </BlogLayout>
      </HtmlClassNameProvider>
  )
}

export default function BlogTagsPostsPage(props) {
  if (!isCategoryPermalink(props.tag.permalink)) {
    return <OriginalBlogTagsPostsPage {...props} />
  }
  return <CategoryPostsPage {...props} />
}
