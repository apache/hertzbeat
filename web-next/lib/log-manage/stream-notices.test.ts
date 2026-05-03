import { describe, expect, it } from 'vitest';
import { shouldShowStreamBackpressureNotice, shouldShowStreamPauseOverlay } from './stream-notices';

describe('stream notices', () => {
  it('shows the pause overlay only when the stream is paused and has visible rows', () => {
    expect(shouldShowStreamPauseOverlay({ isPaused: true, itemCount: 3 })).toBe(true);
    expect(shouldShowStreamPauseOverlay({ isPaused: true, itemCount: 0 })).toBe(false);
    expect(shouldShowStreamPauseOverlay({ isPaused: false, itemCount: 3 })).toBe(false);
  });

  it('shows the backpressure notice only when dropped rows have accumulated', () => {
    expect(shouldShowStreamBackpressureNotice(2)).toBe(true);
    expect(shouldShowStreamBackpressureNotice(0)).toBe(false);
    expect(shouldShowStreamBackpressureNotice(-1)).toBe(false);
  });
});
