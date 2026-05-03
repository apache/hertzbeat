import { describe, expect, it } from 'vitest';
import { buildAlertGroupUrl } from './query-state';

describe('alert group query state', () => {
  it('builds group list url with search', () => {
    expect(buildAlertGroupUrl('cpu')).toBe('/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc&search=cpu');
  });

  it('builds clean group list url when empty', () => {
    expect(buildAlertGroupUrl('')).toBe('/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
