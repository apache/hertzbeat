import { describe, expect, it } from 'vitest';
import {
  MONITOR_HISTORY_SMOKE_FIELD,
  MONITOR_HISTORY_SMOKE_METRICS,
  MONITOR_SMOKE_APP,
  MONITOR_SMOKE_HOST,
  MONITOR_SMOKE_INTERVALS,
  MONITOR_SMOKE_PORT,
  MONITOR_SMOKE_URI,
  buildMonitorHistorySmokePath,
  buildWebsiteMonitorSmokeName,
  buildWebsiteMonitorSmokePayload,
  countHistorySamples,
  extractMonitorFromPage,
  hasHistorySamples,
  hasRealtimeSummarySamples
} from './monitor-route-smoke-lib.mjs';

describe('monitor-route smoke helpers', () => {
  it('builds a website smoke payload with the explicit uri and polling-safe defaults needed for live evidence', () => {
    const name = buildWebsiteMonitorSmokeName('unit');

    expect(name).toBe('codex-monitor-smoke-unit');
    expect(buildWebsiteMonitorSmokePayload(name)).toEqual({
      collector: '',
      monitor: {
        app: MONITOR_SMOKE_APP,
        name,
        instance: MONITOR_SMOKE_HOST,
        scrape: 'static',
        intervals: MONITOR_SMOKE_INTERVALS,
        scheduleType: 'interval',
        status: 0,
        labels: {},
        annotations: {}
      },
      params: [
        { field: 'host', type: 1, paramValue: MONITOR_SMOKE_HOST },
        { field: 'port', type: 0, paramValue: MONITOR_SMOKE_PORT },
        { field: 'uri', type: 1, paramValue: MONITOR_SMOKE_URI },
        { field: 'ssl', type: 1, paramValue: true }
      ],
      grafanaDashboard: { enabled: false }
    });
  });

  it('finds the exact smoke monitor from a paged list payload', () => {
    expect(
      extractMonitorFromPage(
        {
          content: [
            { id: 1, name: 'codex-monitor-smoke-older', instance: 'example.com:443' },
            { id: 2, name: 'codex-monitor-smoke-target', instance: 'example.com:443' }
          ]
        },
        'codex-monitor-smoke-target'
      )
    ).toEqual({
      id: 2,
      name: 'codex-monitor-smoke-target',
      instance: 'example.com:443'
    });

    expect(extractMonitorFromPage({ content: [] }, 'missing')).toBeNull();
  });

  it('builds the history path and detects non-empty realtime/history evidence', () => {
    expect(buildMonitorHistorySmokePath('example.com:443')).toBe(
      `/api/monitor/example.com%3A443/metric/${MONITOR_SMOKE_APP}.${MONITOR_HISTORY_SMOKE_METRICS}.${MONITOR_HISTORY_SMOKE_FIELD}?history=30m&interval=false`
    );

    expect(
      hasRealtimeSummarySamples({
        valueRows: [
          {
            values: [{ origin: '154' }, { origin: '0' }]
          }
        ]
      })
    ).toBe(true);
    expect(hasRealtimeSummarySamples({ valueRows: [{ values: [] }] })).toBe(false);

    expect(
      countHistorySamples({
        values: {
          '': [{ origin: '154', time: 1 }, { origin: '201', time: 2 }]
        }
      })
    ).toBe(2);
    expect(hasHistorySamples({ values: { '': [{ origin: '154', time: 1 }] } })).toBe(true);
    expect(hasHistorySamples({ values: {} })).toBe(false);
  });
});
