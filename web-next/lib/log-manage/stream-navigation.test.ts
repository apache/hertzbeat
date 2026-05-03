import { describe, expect, it } from 'vitest';
import { getStreamNeighborKeys } from './stream-navigation';

describe('stream navigation', () => {
  const items = [{ key: 'newest' }, { key: 'middle' }, { key: 'oldest' }];

  it('returns neighbors around a visible selection', () => {
    expect(
      getStreamNeighborKeys({
        items,
        selectedKey: 'middle'
      })
    ).toEqual({
      newerKey: 'newest',
      olderKey: 'oldest'
    });
  });

  it('returns one-sided neighbors at the edges', () => {
    expect(
      getStreamNeighborKeys({
        items,
        selectedKey: 'newest'
      })
    ).toEqual({
      newerKey: null,
      olderKey: 'middle'
    });

    expect(
      getStreamNeighborKeys({
        items,
        selectedKey: 'oldest'
      })
    ).toEqual({
      newerKey: 'middle',
      olderKey: null
    });
  });

  it('returns null neighbors when selection is absent from the visible buffer', () => {
    expect(
      getStreamNeighborKeys({
        items,
        selectedKey: 'trimmed'
      })
    ).toEqual({
      newerKey: null,
      olderKey: null
    });
  });
});
