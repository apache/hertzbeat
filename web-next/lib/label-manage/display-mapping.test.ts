import { describe, expect, it } from 'vitest';
import { labelTypeLabel } from './display-mapping';

describe('label display mapping', () => {
  it('maps label type values', () => {
    expect(labelTypeLabel(0)).toBe('auto');
    expect(labelTypeLabel(1)).toBe('user');
    expect(labelTypeLabel(2)).toBe('preset');
    expect(labelTypeLabel(undefined)).toBe('-');
  });
});
