import { describe, expect, it } from 'vitest';
import {
  accumulateUnreadStreamItems,
  isStreamFollowingLatest,
  isStreamPinnedToLatest,
  preservePrependedScrollPosition,
  resolveFirstUnreadStreamKey,
  resolveUnreadStreamDivider,
  shouldResumeFollowLatestFromViewport,
  STREAM_LATEST_THRESHOLD
} from './stream-scroll';

describe('log stream scroll helpers', () => {
  it('treats near-top scroll positions as pinned to latest', () => {
    expect(isStreamPinnedToLatest(0)).toBe(true);
    expect(isStreamPinnedToLatest(STREAM_LATEST_THRESHOLD - 1)).toBe(true);
    expect(isStreamPinnedToLatest(STREAM_LATEST_THRESHOLD + 1)).toBe(false);
  });

  it('preserves viewport position when prepended rows increase scroll height', () => {
    expect(
      preservePrependedScrollPosition({
        previousScrollTop: 120,
        previousScrollHeight: 800,
        nextScrollHeight: 920
      })
    ).toBe(240);
  });

  it('keeps scroll top unchanged when the next height does not grow', () => {
    expect(
      preservePrependedScrollPosition({
        previousScrollTop: 120,
        previousScrollHeight: 800,
        nextScrollHeight: 760
      })
    ).toBe(120);
  });

  it('resets unread count while pinned to the latest logs', () => {
    expect(accumulateUnreadStreamItems({ currentUnread: 4, appendedCount: 3, isPinnedToLatest: true })).toBe(0);
  });

  it('accumulates unread count while browsing older logs', () => {
    expect(accumulateUnreadStreamItems({ currentUnread: 0, appendedCount: 3, isPinnedToLatest: false })).toBe(3);
    expect(accumulateUnreadStreamItems({ currentUnread: 3, appendedCount: 2, isPinnedToLatest: false })).toBe(5);
  });

  it('treats explicit selection as leaving follow-latest mode even near the top', () => {
    expect(
      isStreamFollowingLatest({
        isPinnedToLatest: true,
        hasExplicitSelection: false
      })
    ).toBe(true);

    expect(
      isStreamFollowingLatest({
        isPinnedToLatest: true,
        hasExplicitSelection: true
      })
    ).toBe(false);

    expect(
      isStreamFollowingLatest({
        isPinnedToLatest: false,
        hasExplicitSelection: false
      })
    ).toBe(false);
  });

  it('resumes follow-latest when selection is detached', () => {
    expect(
      isStreamFollowingLatest({
        isPinnedToLatest: true,
        hasExplicitSelection: true,
        isSelectionDetached: true
      })
    ).toBe(true);

    expect(
      isStreamFollowingLatest({
        isPinnedToLatest: true,
        hasExplicitSelection: true,
        isSelectionDetached: false
      })
    ).toBe(false);
  });

  it('resumes follow-latest from viewport state when the user scrolls back to the latest position', () => {
    expect(
      shouldResumeFollowLatestFromViewport({
        isPinnedToLatest: true,
        hasExplicitSelection: true
      })
    ).toBe(true);

    expect(
      shouldResumeFollowLatestFromViewport({
        isPinnedToLatest: true,
        hasExplicitSelection: false,
        isSelectionDetached: true
      })
    ).toBe(true);

    expect(
      shouldResumeFollowLatestFromViewport({
        isPinnedToLatest: false,
        hasExplicitSelection: true
      })
    ).toBe(false);
  });

  it('resolves the oldest currently visible unread key from the live buffer', () => {
    const items = [{ key: 'newest' }, { key: 'newer' }, { key: 'older' }, { key: 'oldest' }];

    expect(
      resolveFirstUnreadStreamKey({
        items,
        unreadCount: 2
      })
    ).toBe('newer');

    expect(
      resolveFirstUnreadStreamKey({
        items,
        unreadCount: 6
      })
    ).toBe('oldest');
  });

  it('returns null when there is no unread anchor to jump to', () => {
    expect(
      resolveFirstUnreadStreamKey({
        items: [{ key: 'only' }],
        unreadCount: 0
      })
    ).toBeNull();

    expect(
      resolveFirstUnreadStreamKey({
        items: [],
        unreadCount: 3
      })
    ).toBeNull();
  });

  it('resolves the divider before the first older row after unread logs', () => {
    expect(
      resolveUnreadStreamDivider({
        items: [{ key: 'newest' }, { key: 'newer' }, { key: 'older' }, { key: 'oldest' }],
        unreadCount: 2
      })
    ).toEqual({
      beforeKey: 'older',
      unreadCount: 2
    });
  });

  it('returns null when the unread range covers the whole visible buffer or is empty', () => {
    expect(
      resolveUnreadStreamDivider({
        items: [{ key: 'a' }, { key: 'b' }],
        unreadCount: 2
      })
    ).toBeNull();

    expect(
      resolveUnreadStreamDivider({
        items: [{ key: 'a' }, { key: 'b' }],
        unreadCount: 0
      })
    ).toBeNull();
  });
});
