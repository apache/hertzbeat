import React from 'react';
import {BlogPostProvider, useBlogPost} from '@docusaurus/plugin-content-blog/client';
import Link from '@docusaurus/Link';
import './styles.css'

// import BlogPostItem from '@theme/BlogPostItem';
// This is the default component that renders blog posts one by 
// one in a vertical list
//_________________________________________________________________
// export default function BlogPostItems({
//   items,
//   component: BlogPostItemComponent = BlogPostItem,
// }) {
//   return (
//     <>
//       {items.map(({content: BlogPostContent}) => (
//         <BlogPostProvider
//           key={BlogPostContent.metadata.permalink}
//           content={BlogPostContent}>
//           <BlogPostItemComponent>
//             <BlogPostContent />
//           </BlogPostItemComponent>
//         </BlogPostProvider>
//       ))}
//     </>
//   );
// }
//_________________________________________________________________


// _________________________________________________________________
// REFACTORED BLOG SITE
// _________________________________________________________________

// Renders a blog card out of data from a blog post
function BlogCard() {

  // Docusaurus Hook giving you access to the current post's metadata
  // formats it for BlogCard rendering
  const {metadata} = useBlogPost();
  const {permalink, title, date, authors, description, tags} = metadata;
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Rending a BlogCard
  return (
    <div className="blog-card">
      <div className="blog-card__content">
        <div className="blog-card__tags">
          {tags.slice(0, 2).map((tag) => (
            <span key={tag.label} className="blog-card__tag">
              {tag.label}
            </span>
          ))}
        </div>
        <Link to={permalink} className="blog-card__title">
          {title}
        </Link>
        <p className="blog-card__description">{description}</p>
        <div className="blog-card__footer">
          <span className="blog-card__date">{formattedDate}</span>
          {authors.length > 0 && (
            <span className="blog-card__author">· {authors[0].name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component - Access each blog posts in items and renders each one
// a BlogCard() as defined in the top. The className, "blog-grid", is a
// column card grid.
export default function BlogPostItems({items}) {
  return (
    <div className="blog-grid">
      {items.map(({content: BlogPostContent}) => (
        <BlogPostProvider
          // Rendering BlogCard()
          key={BlogPostContent.metadata.permalink}
          content={BlogPostContent}>
          <BlogCard />
        </BlogPostProvider>
      ))}
    </div>
  );
}

