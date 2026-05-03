import { describe, expect, it } from 'vitest';
import { buildAlertSilenceUrl } from './query-state';

describe('alert silence query state', () => {
  it('builds silence list url with search', () => {
    expect(buildAlertSilenceUrl('cpu')).toBe('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc&search=cpu');
  });

  it('builds clean silence list url when empty', () => {
    expect(buildAlertSilenceUrl('')).toBe('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
