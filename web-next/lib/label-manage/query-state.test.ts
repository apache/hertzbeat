import { describe, expect, it } from 'vitest';
import { buildLabelUrl, normalizeLabelQueryType } from './query-state';

describe('label query state', () => {
  it('builds label list url with search and type', () => {
    expect(buildLabelUrl({ search: ' team ', type: '1' })).toBe('/label?pageIndex=0&pageSize=9999&type=1&search=team');
  });

  it('builds a clean url when empty', () => {
    expect(buildLabelUrl({ search: '', type: '' })).toBe('/label?pageIndex=0&pageSize=9999');
  });

  it('drops route-only or display label types before calling the backend', () => {
    expect(normalizeLabelQueryType(' manual ')).toBe('');
    expect(normalizeLabelQueryType('auto')).toBe('');
    expect(buildLabelUrl({ search: 'codex-label', type: 'manual' })).toBe('/label?pageIndex=0&pageSize=9999&search=codex-label');
  });
});
