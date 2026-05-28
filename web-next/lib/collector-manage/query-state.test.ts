import { describe, expect, it } from 'vitest';
import { buildCollectorUrl } from './query-state';

describe('collector query state', () => {
  it('builds collector url with search', () => {
    expect(buildCollectorUrl({ pageIndex: 0, pageSize: 8, search: 'edge' })).toBe('/collector?pageIndex=0&pageSize=8&name=edge');
  });

  it('builds clean collector url when empty', () => {
    expect(buildCollectorUrl({ pageIndex: 0, pageSize: 8, search: '' })).toBe('/collector?pageIndex=0&pageSize=8');
  });

  it('preserves Angular table page index and page size selections', () => {
    expect(buildCollectorUrl({ pageIndex: 2, pageSize: 15, search: 'edge' })).toBe('/collector?pageIndex=2&pageSize=15&name=edge');
  });

  it('clamps invalid page state before building the backend query', () => {
    expect(buildCollectorUrl({ pageIndex: -1, pageSize: 0, search: ' edge ' })).toBe('/collector?pageIndex=0&pageSize=1&name=edge');
  });
});
