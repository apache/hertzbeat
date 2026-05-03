import { describe, expect, it } from 'vitest';
import { buildLabelUrl } from './query-state';

describe('label query state', () => {
  it('builds label list url with search and type', () => {
    expect(buildLabelUrl({ search: 'team', type: '1' })).toBe('/label?pageIndex=0&pageSize=8&search=team&type=1');
  });

  it('builds a clean url when empty', () => {
    expect(buildLabelUrl({ search: '', type: '' })).toBe('/label?pageIndex=0&pageSize=8');
  });
});
