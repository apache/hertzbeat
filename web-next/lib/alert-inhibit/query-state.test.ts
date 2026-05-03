import { describe, expect, it } from 'vitest';
import { buildAlertInhibitUrl } from './query-state';

describe('alert inhibit query state', () => {
  it('builds inhibit list url with search', () => {
    expect(buildAlertInhibitUrl('cpu')).toBe('/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc&search=cpu');
  });

  it('builds clean inhibit list url when empty', () => {
    expect(buildAlertInhibitUrl('')).toBe('/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
