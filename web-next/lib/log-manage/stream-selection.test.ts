import { describe, expect, it } from 'vitest';
import { resolveStreamSelection } from './stream-selection';

describe('stream selection', () => {
  const items = [
    { key: 'newest', entry: { value: 'newest' } },
    { key: 'older', entry: { value: 'older' } }
  ];

  it('keeps the visible selected row when it still exists in the buffer', () => {
    expect(
      resolveStreamSelection({
        items,
        selectedKey: 'older',
        persisted: { key: 'older', entry: { value: 'older' } }
      })
    ).toEqual({
      selected: { key: 'older', entry: { value: 'older' } },
      detached: false
    });
  });

  it('keeps a persisted row selected after it was trimmed from the buffer', () => {
    expect(
      resolveStreamSelection({
        items: [items[0]],
        selectedKey: 'older',
        persisted: { key: 'older', entry: { value: 'older' } }
      })
    ).toEqual({
      selected: { key: 'older', entry: { value: 'older' } },
      detached: true
    });
  });

  it('falls back to the newest visible row when no explicit selection exists', () => {
    expect(
      resolveStreamSelection({
        items,
        selectedKey: null,
        persisted: null
      })
    ).toEqual({
      selected: items[0],
      detached: false
    });
  });

  it('returns no selection when neither the buffer nor persisted state has entries', () => {
    expect(
      resolveStreamSelection({
        items: [],
        selectedKey: null,
        persisted: null
      })
    ).toEqual({
      selected: null,
      detached: false
    });
  });
});
