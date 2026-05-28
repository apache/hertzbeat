import { describe, expect, it } from 'vitest';
import { buildMonitorEditorCancelUrl, buildMonitorEditorReturnUrl } from './navigation';

describe('monitor editor navigation', () => {
  it('builds the filtered return path when app is present', () => {
    expect(buildMonitorEditorReturnUrl('website')).toBe('/monitors?app=website');
  });

  it('falls back to the list root when app is empty', () => {
    expect(buildMonitorEditorReturnUrl('')).toBe('/monitors');
    expect(buildMonitorEditorReturnUrl(undefined)).toBe('/monitors');
  });

  it('prefers safe internal return targets and otherwise rebuilds the list route from preserved context', () => {
    expect(buildMonitorEditorReturnUrl('website', { returnTo: '/entities/42' })).toBe('/entities/42');
    expect(
      buildMonitorEditorReturnUrl('website', {
        labels: 'team=platform',
        pageIndex: '1',
        pageSize: '20',
        entityId: '42',
        entityName: 'Checkout Service',
        returnTo: '//evil.example'
      })
    ).toBe(
      '/monitors?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=20&entityId=42&entityName=Checkout+Service'
    );
  });

  it('keeps Angular-style cancel navigation on the monitor list root unless a safe return target exists', () => {
    expect(buildMonitorEditorCancelUrl()).toBe('/monitors');
    expect(buildMonitorEditorCancelUrl({ labels: 'team=platform', pageIndex: '2' })).toBe('/monitors');
    expect(buildMonitorEditorCancelUrl({ returnTo: '/entities/42?returnLabel=Checkout' })).toBe('/entities/42');
    expect(buildMonitorEditorCancelUrl({ returnTo: '//evil.example', labels: 'team=platform' })).toBe('/monitors');
  });
});
