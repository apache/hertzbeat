import { describe, expect, it } from 'vitest';
import { resolveStreamReconnectDelayMs, resolveStreamReconnectSeconds, STREAM_RECONNECT_DELAY_MS } from './stream-reconnect';

describe('stream reconnect helpers', () => {
  it('returns null when no reconnect is pending', () => {
    expect(resolveStreamReconnectDelayMs({ reconnectAt: null, now: 1000 })).toBeNull();
    expect(resolveStreamReconnectSeconds({ reconnectAt: null, now: 1000 })).toBeNull();
  });

  it('returns remaining delay in milliseconds', () => {
    expect(resolveStreamReconnectDelayMs({ reconnectAt: 6000, now: 1000 })).toBe(STREAM_RECONNECT_DELAY_MS);
  });

  it('rounds remaining delay up to the next visible second', () => {
    expect(resolveStreamReconnectSeconds({ reconnectAt: 6000, now: 1000 })).toBe(5);
    expect(resolveStreamReconnectSeconds({ reconnectAt: 6000, now: 1801 })).toBe(5);
    expect(resolveStreamReconnectSeconds({ reconnectAt: 6000, now: 2001 })).toBe(4);
  });

  it('clamps expired reconnect windows to zero', () => {
    expect(resolveStreamReconnectDelayMs({ reconnectAt: 1000, now: 1400 })).toBe(0);
    expect(resolveStreamReconnectSeconds({ reconnectAt: 1000, now: 1400 })).toBe(0);
  });
});
