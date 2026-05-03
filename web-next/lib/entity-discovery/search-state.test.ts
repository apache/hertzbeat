import { describe, expect, it } from 'vitest';
import { resolveDiscoverySearchSubmission } from './search-state';

describe('entity discovery search state', () => {
  it('treats blank search submissions as an idle workspace reset', () => {
    expect(resolveDiscoverySearchSubmission('   ')).toEqual({
      mode: 'idle',
      normalizedSearch: null
    });
  });

  it('normalizes non-empty search submissions before the controller runs', () => {
    expect(resolveDiscoverySearchSubmission(' checkout ')).toEqual({
      mode: 'search',
      normalizedSearch: 'checkout'
    });
  });
});
