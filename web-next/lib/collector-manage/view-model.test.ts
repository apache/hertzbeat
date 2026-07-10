import { describe, expect, it } from 'vitest';
import { buildCollectorClusterHealthEvidence, buildCollectorFacts, buildCollectorRows, buildCollectorTableRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({
  locale: 'zh-CN',
  overrides: {
    'collector.pinned': 'Pinned',
    'collector.dispatched': 'Dispatched',
    'collector.mode.public': 'Public',
    'collector.mode.private': 'Private',
    'monitor.collector.status.online': 'Online',
    'monitor.collector.status.offline': 'Offline'
  }
});

describe('collector view model', () => {
  it('builds collector facts', () => {
    expect(
      buildCollectorFacts(
        {
          totalElements: 3,
          content: [
            {
              collector: { gmtUpdate: '2026-04-10T10:00:00Z' },
              pinMonitorNum: 2,
              dispatchMonitorNum: 5
            }
          ]
        } as any,
        t
      )
    ).toEqual([
      { label: t('common.workspace'), value: 'setting/collector' },
      { label: t('common.total'), value: '3' },
      { label: t('common.current-page-count'), value: '1' },
      {
        label: t('collector.health.cluster.title'),
        value: t('collector.health.cluster.copy', { online: 0, total: 1 }),
        meta: t('collector.health.cluster.meta', { tasks: 7, offline: 1 }),
        freshness: t('collector.health.cluster.freshness', { time: '2026-04-10T10:00:00Z' }),
        tone: 'danger'
      },
      { label: 'Pinned', value: '2' },
      { label: 'Dispatched', value: '5' }
    ]);
  });

  it('uses collector-specific health copy when the current collector view is empty', () => {
    expect(buildCollectorClusterHealthEvidence([], () => '-', t)).toEqual({
      title: t('collector.health.cluster.title'),
      copy: t('collector.health.cluster.empty-copy'),
      meta: t('collector.health.cluster.empty-meta'),
      freshness: t('collector.health.cluster.freshness', { time: '-' }),
      tone: 'neutral'
    });
  });

  it('builds collector rows', () => {
    expect(
      buildCollectorRows(
        [
          {
            collector: { name: 'edge-a', ip: '10.0.0.1', status: 0, mode: 'public', version: '1.0.0', gmtUpdate: '2026-04-10T10:00:00Z' },
            pinMonitorNum: 2,
            dispatchMonitorNum: 5
          }
        ] as any,
        t
      )
    ).toEqual([
      { title: 'edge-a', copy: '10.0.0.1 · Online', meta: 'pin 2 · dispatch 5' }
    ]);
  });

  it('builds collector table rows', () => {
    expect(
      buildCollectorTableRows(
        [
          {
            collector: { name: 'edge-a', ip: '10.0.0.1', status: 0, mode: 'public', version: '1.0.0', gmtUpdate: '2026-04-10T10:00:00Z' },
            pinMonitorNum: 2,
            dispatchMonitorNum: 5
          },
          {
            collector: { name: 'main-default-collector', ip: '10.0.0.9', status: 1, mode: 'private' },
            pinMonitorNum: 0,
            dispatchMonitorNum: 1
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: 'edge-a',
        name: 'edge-a',
        statusLabel: 'Online',
        statusTone: 'success',
        modeLabel: 'Public',
        taskCount: '7',
        pinCount: '2',
        dispatchCount: '5',
        ip: '10.0.0.1',
        version: '1.0.0',
        updatedAt: '2026-04-10 18:00:00',
        healthEvidence: {
          title: t('collector.health.cluster.title'),
          copy: t('collector.health.cluster.copy', { online: 1, total: 1 }),
          meta: t('collector.health.cluster.meta', { tasks: 7, offline: 0 }),
          freshness: t('collector.health.cluster.freshness', { time: '2026-04-10 18:00:00' }),
          tone: 'success'
        },
        canMutate: true,
        nextAction: 'offline'
      },
      {
        key: 'main-default-collector',
        name: 'main-default-collector',
        statusLabel: 'Offline',
        statusTone: 'danger',
        modeLabel: 'Private',
        taskCount: '1',
        pinCount: '0',
        dispatchCount: '1',
        ip: '10.0.0.9',
        version: t('common.none'),
        updatedAt: '2026-04-10 18:00:00',
        healthEvidence: {
          title: t('collector.health.cluster.title'),
          copy: t('collector.health.cluster.copy', { online: 0, total: 1 }),
          meta: t('collector.health.cluster.meta', { tasks: 1, offline: 1 }),
          freshness: t('collector.health.cluster.freshness', { time: '-' }),
          tone: 'danger'
        },
        canMutate: false,
        nextAction: 'online'
      }
    ]);
  });

  it('renders missing collector row facts with the localized empty fallback', () => {
    expect(
      buildCollectorTableRows(
        [
          {
            collector: { name: 'edge-empty', ip: ' ', status: 0, mode: 'public', version: '' },
            pinMonitorNum: 0,
            dispatchMonitorNum: 0
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0]
    ).toMatchObject({
      key: 'edge-empty',
      name: 'edge-empty',
      ip: t('common.none'),
      version: t('common.none'),
      statusLabel: 'Online',
      statusTone: 'success'
    });
  });
});
