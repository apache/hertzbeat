import { isStreamPinnedToLatest } from './stream-scroll';

export const STREAM_VIEWPORT_ROW_HEIGHT = 40;
export const STREAM_VIEWPORT_OVERSCAN = 6;

function resolveVisibleStreamRowCount(viewportHeight: number, rowHeight: number) {
  const safeViewportHeight = Math.max(viewportHeight, rowHeight);
  return Math.max(1, Math.ceil(safeViewportHeight / rowHeight));
}

function clampStreamWindowStartIndex({
  itemCount,
  visibleCount,
  startIndex
}: {
  itemCount: number;
  visibleCount: number;
  startIndex: number;
}) {
  return Math.min(Math.max(0, itemCount - visibleCount), Math.max(0, startIndex));
}

export function findSelectedStreamRowIndex({
  itemKeys,
  selectedKey,
  detached
}: {
  itemKeys: string[];
  selectedKey: string | null;
  detached: boolean;
}) {
  if (detached || !selectedKey) {
    return null;
  }

  const index = itemKeys.indexOf(selectedKey);
  return index >= 0 ? index : null;
}

export function readStreamViewportState(container: Pick<HTMLElement, 'scrollTop' | 'clientHeight'>) {
  return {
    scrollTop: container.scrollTop,
    viewportHeight: container.clientHeight,
    isPinnedToLatest: isStreamPinnedToLatest(container.scrollTop)
  };
}

export function resolveCompensatedStreamViewportState({
  previousScrollTop,
  previousScrollHeight,
  nextScrollHeight,
  viewportHeight
}: {
  previousScrollTop: number;
  previousScrollHeight: number;
  nextScrollHeight: number;
  viewportHeight: number;
}) {
  const scrollTop =
    nextScrollHeight > previousScrollHeight
      ? previousScrollTop + (nextScrollHeight - previousScrollHeight)
      : previousScrollTop;

  return {
    scrollTop,
    viewportHeight,
    isPinnedToLatest: isStreamPinnedToLatest(scrollTop)
  };
}

export function resolveResetStreamViewportState({ viewportHeight }: { viewportHeight: number }) {
  return {
    scrollTop: 0,
    viewportHeight,
    isPinnedToLatest: true
  };
}

export function resolveStreamWindow({
  itemCount,
  scrollTop,
  viewportHeight,
  anchorIndex = null,
  rowHeight = STREAM_VIEWPORT_ROW_HEIGHT,
  overscan = STREAM_VIEWPORT_OVERSCAN
}: {
  itemCount: number;
  scrollTop: number;
  viewportHeight: number;
  anchorIndex?: number | null;
  rowHeight?: number;
  overscan?: number;
}) {
  if (itemCount <= 0) {
    return {
      startIndex: 0,
      endIndex: -1,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0
    };
  }

  const visibleCount = resolveVisibleStreamRowCount(viewportHeight, rowHeight);
  const rawStartIndex = Math.floor(Math.max(scrollTop, 0) / rowHeight);
  const windowSize = visibleCount + overscan * 2;
  let startIndex = clampStreamWindowStartIndex({
    itemCount,
    visibleCount: windowSize,
    startIndex: rawStartIndex - overscan
  });
  let endIndex = Math.min(itemCount - 1, startIndex + windowSize - 1);

  if (anchorIndex != null && anchorIndex >= 0 && anchorIndex < itemCount) {
    if (anchorIndex < startIndex) {
      startIndex = clampStreamWindowStartIndex({
        itemCount,
        visibleCount: windowSize,
        startIndex: anchorIndex - overscan
      });
      endIndex = Math.min(itemCount - 1, startIndex + windowSize - 1);
    } else if (anchorIndex > endIndex) {
      startIndex = clampStreamWindowStartIndex({
        itemCount,
        visibleCount: windowSize,
        startIndex: anchorIndex - windowSize + overscan + 1
      });
      endIndex = Math.min(itemCount - 1, startIndex + windowSize - 1);
    }
  }

  return {
    startIndex,
    endIndex,
    topSpacerHeight: startIndex * rowHeight,
    bottomSpacerHeight: Math.max(0, (itemCount - endIndex - 1) * rowHeight)
  };
}

export function resolveStreamPageJumpIndex({
  itemCount,
  selectedIndex,
  scrollTop,
  viewportHeight,
  direction,
  rowHeight = STREAM_VIEWPORT_ROW_HEIGHT
}: {
  itemCount: number;
  selectedIndex: number | null;
  scrollTop: number;
  viewportHeight: number;
  direction: 'newer' | 'older';
  rowHeight?: number;
}) {
  if (itemCount <= 0) {
    return null;
  }

  const pageSize = resolveVisibleStreamRowCount(viewportHeight, rowHeight);
  const anchorIndex = selectedIndex ?? Math.floor(Math.max(scrollTop, 0) / rowHeight);
  const delta = direction === 'newer' ? -pageSize : pageSize;

  return Math.min(itemCount - 1, Math.max(0, anchorIndex + delta));
}

export function scrollSelectedStreamRowIntoView(
  container: HTMLElement | null,
  selectedIndex: number | null,
  rowHeight = STREAM_VIEWPORT_ROW_HEIGHT
) {
  if (!container || selectedIndex == null || selectedIndex < 0) {
    return;
  }

  const itemTop = selectedIndex * rowHeight;
  const itemBottom = itemTop + rowHeight;
  const viewportTop = container.scrollTop;
  const viewportBottom = viewportTop + container.clientHeight;

  if (itemTop < viewportTop) {
    container.scrollTop = itemTop;
    return;
  }

  if (itemBottom > viewportBottom) {
    container.scrollTop = itemBottom - container.clientHeight;
  }
}
