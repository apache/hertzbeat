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
      label: '健康评分 63',
      copy: '采集 1 / 2 健康',
      meta: '告警 1 · 异常 4',
      tone: 'warning'
    });
  });
});
