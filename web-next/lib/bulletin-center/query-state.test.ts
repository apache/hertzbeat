import { describe, expect, it } from 'vitest';
import { applyBulletinSearch, buildBulletinListUrl, resetBulletinSearchState } from './query-state';

describe('bulletin query state', () => {
  it('builds bulletin list url with search', () => {
    expect(buildBulletinListUrl('checkout')).toBe('/bulletin?pageIndex=0&pageSize=8&search=checkout');
  });

  it('builds bulletin list url without search when empty', () => {
    expect(buildBulletinListUrl('')).toBe('/bulletin?pageIndex=0&pageSize=8');
  });

  it('normalizes search text before applying the query', () => {
    expect(applyBulletinSearch('  checkout  ')).toBe('checkout');
  });

  it('resets both search and query state', () => {
    expect(resetBulletinSearchState()).toEqual({ search: '', query: '' });
  });
});
