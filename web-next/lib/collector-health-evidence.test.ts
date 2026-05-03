import { describe, expect, it } from 'vitest';
import { buildCollectorHealthEvidence } from './collector-health-evidence';

describe('collector health evidence', () => {
  it('summarizes collector cluster status for the lightweight health model', () => {
    expect(
      buildCollectorHealthEvidence({
        offlineCollectorCount: 1,
        onlineCollectorCount: 1,
        lastSeenLabel: '2026-04-10 18:00:00',
        taskCount: 11,
        totalCollectorCount: 2
      })
    ).toEqual({
      title: '采集集群健康',
      copy: '采集器 1 / 2 在线',
      meta: '任务 11 · 离线 1',
      freshness: '最近上报 2026-04-10 18:00:00',
      tone: 'warning'
    });
  });

  it('falls back to monitor binding health when collector evidence is not present', () => {
    expect(
      buildCollectorHealthEvidence({
        healthyMonitorCount: 3,
        lastEvidenceLabel: '2026-04-10 18:05:00',
        totalBoundMonitors: 4
      })
    ).toEqual({
      title: '采集健康',
      copy: '监控 3 / 4 健康',
      meta: '采集证据已归并',
      freshness: '最近证据 2026-04-10 18:05:00',
      tone: 'warning'
    });
  });
});
