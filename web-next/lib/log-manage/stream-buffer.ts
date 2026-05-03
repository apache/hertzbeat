export type StreamBufferedItem<T> = {
  key: string;
  entry: T;
};

type StreamKeyEntry = {
  timeUnixNano?: string | number | null;
  traceId?: string | null;
  spanId?: string | null;
};

function keyPart(value: string | number | null | undefined, fallback: string) {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

export function buildStreamItemKey(entry: StreamKeyEntry, sequence: number) {
  return [
    keyPart(entry.timeUnixNano, String(Date.now() * 1_000_000)),
    keyPart(entry.traceId, 'no-trace'),
    keyPart(entry.spanId, 'no-span'),
    sequence
  ].join(':');
}

export function enqueuePendingStreamItem<T>(pending: StreamBufferedItem<T>[], item: StreamBufferedItem<T>, maxPending: number) {
  const next = [...pending, item];
  const overflow = Math.max(0, next.length - maxPending);

  return {
    pending: overflow > 0 ? next.slice(overflow) : next,
    dropped: overflow
  };
}

export function mergeStreamBatch<T>(current: StreamBufferedItem<T>[], incoming: StreamBufferedItem<T>[], maxVisible: number) {
  const next = [...incoming].reverse().concat(current);
  const overflow = Math.max(0, next.length - maxVisible);

  return {
    items: overflow > 0 ? next.slice(0, maxVisible) : next,
    dropped: overflow
  };
}
