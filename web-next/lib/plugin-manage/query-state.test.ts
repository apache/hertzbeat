import { describe, expect, it } from 'vitest';
import { buildPluginUrl } from './query-state';

describe('plugin query state', () => {
  it('builds plugin list url with search', () => {
    expect(buildPluginUrl({ search: ' smtp ' })).toBe('/plugin?pageIndex=0&pageSize=8&search=smtp');
  });

  it('builds clean plugin list url when empty', () => {
    expect(buildPluginUrl({ search: '' })).toBe('/plugin?pageIndex=0&pageSize=8');
  });

  it('preserves plugin paging state for Angular delete page recovery', () => {
    expect(buildPluginUrl({ search: 'smtp', pageIndex: 2, pageSize: 15 })).toBe('/plugin?pageIndex=2&pageSize=15&search=smtp');
  });
});
