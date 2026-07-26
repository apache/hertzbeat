const SCROLL_KEY = 'hertzbeat.blogListScrollPosition'

// Category pills and pagination links both navigate within the blog list;
// keeping the scroll offset avoids bouncing the reader back to the top.
export function rememberBlogListScrollPosition(event) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({
      pathname: event.currentTarget.pathname,
      position: window.scrollY,
    }))
  } catch {
    // Storage can be disabled without affecting navigation.
  }
}

export function onRouteDidUpdate({location}) {
  let storedPosition
  try {
    storedPosition = sessionStorage.getItem(SCROLL_KEY)
    sessionStorage.removeItem(SCROLL_KEY)
  } catch {
    return
  }
  if (storedPosition === null) {
    return
  }

  try {
    const {pathname, position} = JSON.parse(storedPosition)
    if (pathname === location.pathname && Number.isFinite(position)) {
      window.scrollTo(0, position)
    }
  } catch {
    // Ignore malformed session data left by an older build.
  }
}
