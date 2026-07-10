import { describe, expect, it } from 'vitest';
import { buildCollectorHealthEvidence } from './collector-health-evidence';
import { createTranslatorMock } from '../test/i18n-test-helper';

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
      title: 'Collection cluster health',
      copy: 'Collectors 1 / 2 online',
      meta: 'Tasks 11 · offline 1',
      freshness: 'Last report 2026-04-10 18:00:00',
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
      title: 'Collection health',
      copy: 'Monitors 3 / 4 healthy',
      meta: 'Collection evidence merged',
      freshness: 'Latest evidence 2026-04-10 18:05:00',
      tone: 'warning'
    });
  });

  it('keeps an empty collector cluster distinct from monitor binding health', () => {
    expect(
      buildCollectorHealthEvidence({
        totalCollectorCount: 0,
        onlineCollectorCount: 0,
        offlineCollectorCount: 0,
        taskCount: 0
      })
    ).toEqual({
      title: 'Collection cluster health',
      copy: 'No collectors in this view',
      meta: 'Adjust filters or deploy a collector',
      freshness: 'Last report -',
      tone: 'neutral'
    });
  });

  it('uses the provided runtime translator for collector health evidence copy', () => {
    const t = createTranslatorMock({ locale: 'en-US' });

    expect(
      buildCollectorHealthEvidence(
        {
          offlineCollectorCount: 1,
          onlineCollectorCount: 1,
          lastSeenLabel: '2026-04-10 18:00:00',
          taskCount: 11,
          totalCollectorCount: 2
        },
        t
      )
    ).toEqual({
      title: 'Collection cluster health',
      copy: 'Collectors 1 / 2 online',
      meta: 'Tasks 11 · offline 1',
      freshness: 'Last report 2026-04-10 18:00:00',
      tone: 'warning'
    });
  });
});
