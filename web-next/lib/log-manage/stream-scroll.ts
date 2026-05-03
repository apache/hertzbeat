export const STREAM_LATEST_THRESHOLD = 24;

export function isStreamPinnedToLatest(scrollTop: number, threshold = STREAM_LATEST_THRESHOLD) {
  return scrollTop <= threshold;
}

export function isStreamFollowingLatest({
  isPinnedToLatest,
  hasExplicitSelection
  , isSelectionDetached
}: {
  isPinnedToLatest: boolean;
  hasExplicitSelection: boolean;
  isSelectionDetached?: boolean;
}) {
  return isPinnedToLatest && (!hasExplicitSelection || isSelectionDetached === true);
}

export function shouldResumeFollowLatestFromViewport({
  isPinnedToLatest,
  hasExplicitSelection,
  isSelectionDetached = false
}: {
  isPinnedToLatest: boolean;
  hasExplicitSelection: boolean;
  isSelectionDetached?: boolean;
}) {
  return isPinnedToLatest && (hasExplicitSelection || isSelectionDetached);
}

export function preservePrependedScrollPosition({
  previousScrollTop,
  previousScrollHeight,
  nextScrollHeight
}: {
  previousScrollTop: number;
  previousScrollHeight: number;
  nextScrollHeight: number;
}) {
  if (nextScrollHeight <= previousScrollHeight) {
    return previousScrollTop;
  }
  return previousScrollTop + (nextScrollHeight - previousScrollHeight);
}

export function accumulateUnreadStreamItems({
  currentUnread,
  appendedCount,
  isPinnedToLatest
}: {
  currentUnread: number;
  appendedCount: number;
  isPinnedToLatest: boolean;
}) {
  if (isPinnedToLatest) {
    return 0;
  }

  return currentUnread + Math.max(0, appendedCount);
}

export function resolveFirstUnreadStreamKey<T extends { key: string }>({
  items,
  unreadCount
}: {
  items: T[];
  unreadCount: number;
}) {
  if (unreadCount <= 0 || items.length === 0) {
    return null;
  }

  const index = Math.min(unreadCount, items.length) - 1;
  return items[index]?.key ?? null;
}

export function resolveUnreadStreamDivider<T extends { key: string }>({
  items,
  unreadCount
}: {
  items: T[];
  unreadCount: number;
}) {
  if (unreadCount <= 0 || items.length === 0 || unreadCount >= items.length) {
    return null;
  }

  const boundaryIndex = Math.min(unreadCount, items.length - 1);
  const boundaryItem = items[boundaryIndex];
  if (!boundaryItem) {
    return null;
  }

  return {
    beforeKey: boundaryItem.key,
    unreadCount: Math.min(unreadCount, items.length)
  };
}
