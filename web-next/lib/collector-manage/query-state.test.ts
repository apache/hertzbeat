import { describe, expect, it } from 'vitest';
import { buildCollectorUrl } from './query-state';

describe('collector query state', () => {
  it('builds collector url with search', () => {
    expect(buildCollectorUrl({ search: 'edge' })).toBe('/collector?pageIndex=0&pageSize=8&name=edge');
  });

  it('builds clean collector url when empty', () => {
    expect(buildCollectorUrl({ search: '' })).toBe('/collector?pageIndex=0&pageSize=8');
  });
});
