import { describe, expect, it } from 'vitest';
import { buildCollectorFacts, buildCollectorRows, buildCollectorTableRows } from './view-model';
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
      { label: 'Workspace', value: 'setting/collector' },
      { label: '总量', value: '3' },
      { label: '当前页', value: '1' },
      {
        label: '采集集群健康',
        value: '采集器 0 / 1 在线',
        meta: '任务 7 · 离线 1',
        freshness: '最近上报 2026-04-10T10:00:00Z',
        tone: 'danger'
      },
      { label: 'Pinned', value: '2' },
      { label: 'Dispatched', value: '5' }
    ]);
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
        modeLabel: 'Public',
        taskCount: '7',
        pinCount: '2',
        dispatchCount: '5',
        ip: '10.0.0.1',
        version: '1.0.0',
        updatedAt: '2026-04-10 18:00:00',
        healthEvidence: {
          title: '采集集群健康',
          copy: '采集器 1 / 1 在线',
          meta: '任务 7 · 离线 0',
          freshness: '最近上报 2026-04-10 18:00:00',
          tone: 'success'
        },
        canMutate: true,
        nextAction: 'offline'
      },
      {
        key: 'main-default-collector',
        name: 'main-default-collector',
        statusLabel: 'Offline',
        modeLabel: 'Private',
        taskCount: '1',
        pinCount: '0',
        dispatchCount: '1',
        ip: '10.0.0.9',
        version: '-',
        updatedAt: '2026-04-10 18:00:00',
        healthEvidence: {
          title: '采集集群健康',
          copy: '采集器 0 / 1 在线',
          meta: '任务 1 · 离线 1',
          freshness: '最近上报 -',
          tone: 'danger'
        },
        canMutate: false,
        nextAction: 'online'
      }
    ]);
  });
});
