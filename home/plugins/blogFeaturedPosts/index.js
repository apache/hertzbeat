const FEATURED_POST_COUNT = 4

function toClientPost({metadata}) {
  return {
    metadata: {
      permalink: metadata.permalink,
      title: metadata.title,
      description: metadata.description,
      date: metadata.date,
      tags: metadata.tags,
      authors: metadata.authors,
    },
    frontMatter: {
      image: metadata.frontMatter.image,
    },
  }
}

module.exports = function blogFeaturedPostsPlugin() {
  return {
    name: 'blog-featured-posts',
    getClientModules() {
      return [require.resolve('./scrollPosition')]
    },
    async allContentLoaded({allContent, actions}) {
      const blogContent = allContent['docusaurus-plugin-content-blog']?.default
      const posts = blogContent?.blogPosts?.slice(0, FEATURED_POST_COUNT).map(toClientPost) ?? []
      actions.setGlobalData({posts})
    },
  }
}
