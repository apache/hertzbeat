import { describe, expect, it } from 'vitest';
import { buildLightweightEntityHealthAffordance } from './entity-health-affordance';

describe('lightweight entity health affordance', () => {
  it('summarizes collection health, alert pressure, and anomaly hints into a compact score', () => {
    expect(
      buildLightweightEntityHealthAffordance({
        status: 'warning',
        monitorCount: 2,
        healthyMonitorCount: 1,
        downMonitorCount: 1,
        activeAlertCount: 1,
        recentTraceCount: 20,
        recentErrorTraceCount: 2,
        logHintCount: 1
      })
    ).toEqual({
      score: 63,
      scoreText: '63 / 100',
      label: 'Health score 63',
      copy: 'Collected 1 / 2 healthy',
      meta: 'Alerts 1 · anomalies 4',
      tone: 'warning'
    });
  });

  it('scores raw status aliases without depending on localized status labels', () => {
    const base = {
      activeAlertCount: 0,
      downMonitorCount: 0,
      healthyMonitorCount: 0,
      logHintCount: 0,
      monitorCount: 0,
      recentErrorTraceCount: 0,
      recentTraceCount: 0
    };

    expect(buildLightweightEntityHealthAffordance({ ...base, status: 'healthy' })).toMatchObject({
      score: 92,
      tone: 'success'
    });
    expect(buildLightweightEntityHealthAffordance({ ...base, status: 'unknown' })).toMatchObject({
      score: 80,
      tone: 'warning'
    });
    expect(buildLightweightEntityHealthAffordance({ ...base, status: 'down' })).toMatchObject({
      score: 68,
      tone: 'warning'
    });
  });
});
