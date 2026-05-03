import { describe, expect, it, vi } from 'vitest';
import {
  findSelectedStreamRowIndex,
  readStreamViewportState,
  resolveCompensatedStreamViewportState,
  resolveStreamPageJumpIndex,
  resolveResetStreamViewportState,
  resolveStreamWindow,
  scrollSelectedStreamRowIntoView,
  STREAM_VIEWPORT_OVERSCAN,
  STREAM_VIEWPORT_ROW_HEIGHT
} from './stream-viewport';

describe('log stream viewport helpers', () => {
  it('keeps the virtual row height compact for a continuous live stream', () => {
    expect(STREAM_VIEWPORT_ROW_HEIGHT).toBe(40);
  });

  it('finds the selected row index when the selection is visible', () => {
    expect(
      findSelectedStreamRowIndex({
        itemKeys: ['a', 'b', 'c'],
        selectedKey: 'b',
        detached: false
      })
    ).toBe(1);
  });

  it('does not return a row index for detached or missing selections', () => {
    expect(
      findSelectedStreamRowIndex({
        itemKeys: ['a', 'b', 'c'],
        selectedKey: 'missing',
        detached: false
      })
    ).toBeNull();
    expect(
      findSelectedStreamRowIndex({
        itemKeys: ['a', 'b', 'c'],
        selectedKey: 'b',
        detached: true
      })
    ).toBeNull();
  });

  it('reads viewport metrics and latest-pin state from the stream container', () => {
    expect(
      readStreamViewportState({
        scrollTop: 12,
        clientHeight: STREAM_VIEWPORT_ROW_HEIGHT * 3
      } as Pick<HTMLElement, 'scrollTop' | 'clientHeight'>)
    ).toEqual({
      scrollTop: 12,
      viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 3,
      isPinnedToLatest: true
    });

    expect(
      readStreamViewportState({
        scrollTop: STREAM_VIEWPORT_ROW_HEIGHT,
        clientHeight: STREAM_VIEWPORT_ROW_HEIGHT * 2
      } as Pick<HTMLElement, 'scrollTop' | 'clientHeight'>)
    ).toEqual({
      scrollTop: STREAM_VIEWPORT_ROW_HEIGHT,
      viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 2,
      isPinnedToLatest: false
    });
  });

  it('resolves viewport state after prepended rows shift the scroll anchor', () => {
    expect(
      resolveCompensatedStreamViewportState({
        previousScrollTop: 120,
        previousScrollHeight: 800,
        nextScrollHeight: 920,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 3
      })
    ).toEqual({
      scrollTop: 240,
      viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 3,
      isPinnedToLatest: false
    });
  });

  it('resets the viewport state to the latest position', () => {
    expect(
      resolveResetStreamViewportState({
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 3
      })
    ).toEqual({
      scrollTop: 0,
      viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 3,
      isPinnedToLatest: true
    });
  });

  it('scrolls the selected row into view within the stream container', () => {
    const container = {
      scrollTop: 0,
      clientHeight: STREAM_VIEWPORT_ROW_HEIGHT * 2
    } as unknown as HTMLElement;

    scrollSelectedStreamRowIntoView(container, 2);

    expect(container.scrollTop).toBe(STREAM_VIEWPORT_ROW_HEIGHT);
  });

  it('skips scrolling when the selected row does not exist', () => {
    const container = {
      scrollTop: 24,
      clientHeight: STREAM_VIEWPORT_ROW_HEIGHT * 2
    } as unknown as HTMLElement;

    scrollSelectedStreamRowIntoView(container, 4);

    expect(container.scrollTop).toBe(STREAM_VIEWPORT_ROW_HEIGHT * 3);
  });

  it('does nothing for null selections', () => {
    const container = {
      scrollTop: 24,
      clientHeight: STREAM_VIEWPORT_ROW_HEIGHT * 2
    } as unknown as HTMLElement;

    scrollSelectedStreamRowIntoView(container, null);

    expect(container.scrollTop).toBe(24);
  });

  it('resolves a virtualized window around the current scroll position', () => {
    expect(
      resolveStreamWindow({
        itemCount: 100,
        scrollTop: STREAM_VIEWPORT_ROW_HEIGHT * 20,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4
      })
    ).toEqual({
      startIndex: 20 - STREAM_VIEWPORT_OVERSCAN,
      endIndex: 20 + 4 + STREAM_VIEWPORT_OVERSCAN - 1,
      topSpacerHeight: (20 - STREAM_VIEWPORT_OVERSCAN) * STREAM_VIEWPORT_ROW_HEIGHT,
      bottomSpacerHeight: (100 - (20 + 4 + STREAM_VIEWPORT_OVERSCAN - 1) - 1) * STREAM_VIEWPORT_ROW_HEIGHT
    });
  });

  it('clamps the virtualized window near the edges', () => {
    expect(
      resolveStreamWindow({
        itemCount: 3,
        scrollTop: 0,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 2,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0
    });
  });

  it('shifts the virtualized window to keep the selected anchor row rendered', () => {
    expect(
      resolveStreamWindow({
        itemCount: 100,
        scrollTop: 0,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4,
        anchorIndex: 30
      })
    ).toEqual({
      startIndex: 21,
      endIndex: 36,
      topSpacerHeight: 21 * STREAM_VIEWPORT_ROW_HEIGHT,
      bottomSpacerHeight: (100 - 37) * STREAM_VIEWPORT_ROW_HEIGHT
    });
  });

  it('jumps a full viewport page from the selected row when paging through the stream', () => {
    expect(
      resolveStreamPageJumpIndex({
        itemCount: 100,
        selectedIndex: 20,
        scrollTop: 0,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4,
        direction: 'older'
      })
    ).toBe(24);

    expect(
      resolveStreamPageJumpIndex({
        itemCount: 100,
        selectedIndex: 20,
        scrollTop: 0,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4,
        direction: 'newer'
      })
    ).toBe(16);
  });

  it('falls back to the visible viewport position when no row is selected', () => {
    expect(
      resolveStreamPageJumpIndex({
        itemCount: 100,
        selectedIndex: null,
        scrollTop: STREAM_VIEWPORT_ROW_HEIGHT * 10,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4,
        direction: 'older'
      })
    ).toBe(14);
  });

  it('clamps page jumps to the available stream buffer', () => {
    expect(
      resolveStreamPageJumpIndex({
        itemCount: 3,
        selectedIndex: 0,
        scrollTop: 0,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4,
        direction: 'newer'
      })
    ).toBe(0);

    expect(
      resolveStreamPageJumpIndex({
        itemCount: 3,
        selectedIndex: 2,
        scrollTop: STREAM_VIEWPORT_ROW_HEIGHT,
        viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 4,
        direction: 'older'
      })
    ).toBe(2);
  });
});
