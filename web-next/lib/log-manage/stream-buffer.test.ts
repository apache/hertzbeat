import { describe, expect, it } from 'vitest';
import { buildStreamItemKey, enqueuePendingStreamItem, mergeStreamBatch } from './stream-buffer';

describe('log stream buffer', () => {
  it('caps pending stream items by dropping the oldest buffered entries', () => {
    const first = enqueuePendingStreamItem(
      [
        { key: 'a', entry: { value: 'a' } },
        { key: 'b', entry: { value: 'b' } }
      ],
      { key: 'c', entry: { value: 'c' } },
      2
    );

    expect(first).toEqual({
      pending: [
        { key: 'b', entry: { value: 'b' } },
        { key: 'c', entry: { value: 'c' } }
      ],
      dropped: 1
    });
  });

  it('prepends incoming stream batches in newest-first order and trims overflow', () => {
    const result = mergeStreamBatch(
      [
        { key: 'old-1', entry: { value: 'old-1' } },
        { key: 'old-2', entry: { value: 'old-2' } }
      ],
      [
        { key: 'new-1', entry: { value: 'new-1' } },
        { key: 'new-2', entry: { value: 'new-2' } }
      ],
      3
    );

    expect(result).toEqual({
      items: [
        { key: 'new-2', entry: { value: 'new-2' } },
        { key: 'new-1', entry: { value: 'new-1' } },
        { key: 'old-1', entry: { value: 'old-1' } }
      ],
      dropped: 1
    });
  });

  it('builds unique stream keys from a monotonic sequence when log identity repeats', () => {
    const entry = {
      timeUnixNano: 1777505070267000000,
      traceId: '',
      spanId: ''
    };

    expect([buildStreamItemKey(entry, 400), buildStreamItemKey(entry, 401)]).toEqual([
      '1777505070267000000:no-trace:no-span:400',
      '1777505070267000000:no-trace:no-span:401'
    ]);
  });
});
