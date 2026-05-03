import { describe, expect, it } from 'vitest';
import { buildCompatRedirectTarget, createCompatSearchParamReader } from './search-params';

describe('compat search params', () => {
  it('builds canonical redirect targets while preserving machine context and dropping display-only labels', () => {
    expect(
      buildCompatRedirectTarget('/overview', {
        start: '10',
        end: '20',
        entityId: '7',
        entityName: 'checkout',
        returnTo: '/monitors?returnLabel=Monitors',
        returnLabel: 'Monitors',
        serviceName: 'checkout',
        environment: ['prod', 'staging']
      })
    ).toBe(
      '/overview?start=10&end=20&entityId=7&entityName=checkout&returnTo=%2Fmonitors&serviceName=checkout&environment=prod'
    );
  });

  it('rejects decimal time bounds at compatibility redirect sources instead of forwarding them', () => {
    expect(
      buildCompatRedirectTarget('/overview', {
        start: '1777484896189.989',
        end: '1777485856189.989',
        entityId: '7',
        returnTo: '/trace/manage?traceId=trace-1&returnLabel=Trace',
        returnLabel: 'Overview'
      })
    ).toBe('/overview?entityId=7&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-1');
  });

  it('creates a search-param reader that exposes the normalized compatibility query values', () => {
    const reader = createCompatSearchParamReader({
      content: ' checkout ',
      severity: [' warning ', 'critical'],
      returnTo: '/entities/42'
    });

    expect(reader.get('content')).toBe(' checkout ');
    expect(reader.get('severity')).toBe(' warning ');
    expect(reader.get('returnTo')).toBe('/entities/42');
    expect(reader.get('missing')).toBeNull();
  });
});
