import { describe, expect, it } from 'vitest';
import { buildDefineListUrl, normalizeDefineSearch } from './query-state';

describe('setting define query state', () => {
  it('normalizes search text for encoded array payload', () => {
    expect(normalizeDefineSearch(' cpu > 90 ')).toBe('%5B%22cpu%20%3E%2090%22%5D');
  });

  it('builds define list url with encoded search payload', () => {
    expect(buildDefineListUrl('cpu > 90')).toBe('/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc&search=%5B%22cpu%20%3E%2090%22%5D');
  });

  it('builds define list url without search when empty', () => {
    expect(buildDefineListUrl('')).toBe('/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
