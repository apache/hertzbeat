import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildMonitorDetailFacts,
  buildMonitorWorkbenchSummaryFacts,
  buildMonitorEvidenceRows,
  buildMonitorFavoriteJumpRows,
  filterMonitorHistoryMetricCatalog,
  filterMonitorHistorySeriesRows,
  filterMonitorMetricCatalog,
  buildMonitorGrafanaRows,
  buildMonitorHistoryPointEvidenceRows,
  buildMonitorHistoryPayloadRows,
  buildMonitorHistoryPointRows,
  buildMonitorHistoryPointCompareRows,
  buildMonitorHistoryPointNavigation,
  buildMonitorHistorySeriesSelectorRows,
  buildMonitorHistorySeriesNavigation,
  buildMonitorHistorySelectedPointRows,
  buildMonitorHistorySeriesSummaryRows,
  buildMonitorHistorySeriesRows,
  buildMonitorLabelRows,
  buildMonitorMetricCatalogRows,
  buildMonitorMetricFieldRows,
  buildMonitorMetricPayloadRows,
  buildMonitorMetricRealtimeFactRows,
  buildMonitorMetricRowNavigation,
  filterMonitorMetricTableMatrix,
  buildMonitorMetricSelectedRowTableRows,
  buildMonitorMetricSelectedRowRows,
  buildMonitorMetricTableMatrix,
  buildMonitorMetricTableEvidenceRows,
  buildMonitorMetricTableRows,
  normalizeMonitorFavoriteNames,
  resolveMonitorMetricTableMode,
  buildMonitorNextRows,
  buildMonitorParamRows,
  buildMonitorSummaryMetaRows,
  buildMonitorSummaryStats,
  formatMonitorSchedule,
  monitorStatusLabel,
  resolveMonitorHistoryVisibleSeriesKeys,
  toggleMonitorHistoryVisibleSeriesKey
} from './view-model';

const t = createTranslatorMock();

describe('monitor detail view model', () => {
  it('maps status labels', () => {
    expect(monitorStatusLabel(1)).toBe('UP');
    expect(monitorStatusLabel(2)).toBe('DOWN');
    expect(monitorStatusLabel(0)).toBe('PAUSED');
  });

  it('builds facts', () => {
    expect(
      buildMonitorDetailFacts({ id: 42, status: 2, app: 'checkout', gmtUpdate: 1712730000000 } as any, t, () => '2026-04-10 18:00:00')
    ).toEqual([
      { label: t('monitor.detail.fact.id'), value: '42' },
      { label: t('common.status'), value: 'DOWN' },
      { label: t('common.app'), value: 'checkout' },
      { label: t('common.updated'), value: '2026-04-10 18:00:00' }
    ]);
  });

  it('builds workbench summary facts from realtime, history, and favorite counts', () => {
    expect(buildMonitorWorkbenchSummaryFacts(2, 0, 1, t)).toEqual([
      { key: 'realtime', label: 'Real-time Metrics', value: '2' },
      { key: 'history', label: 'Historical Charts', value: '0' },
      { key: 'favorite', label: 'Favorites', value: '1' }
    ]);
  });

  it('builds evidence rows', () => {
    expect(
      buildMonitorEvidenceRows({ instance: '10.0.0.1', app: 'checkout', gmtUpdate: 1712730000000 } as any, t, () => '2026-04-10 18:00:00')
    ).toEqual([
      { title: t('common.instance'), copy: '10.0.0.1', meta: t('monitor.detail.meta.target') },
      { title: t('common.application'), copy: 'checkout', meta: t('monitor.detail.meta.category') },
      { title: t('monitor.detail.last-update'), copy: '2026-04-10 18:00:00', meta: t('monitor.detail.meta.backend') }
    ]);
  });

  it('builds label rows and next-step rows', () => {
    expect(buildMonitorLabelRows({ region: 'cn' }, t)).toEqual([{ title: 'region', copy: 'cn', meta: 'label' }]);
    expect(buildMonitorNextRows(t)).toEqual([
      { title: t('monitor.detail.next.back.title'), copy: t('monitor.detail.next.back.copy'), meta: 'monitors' },
      { title: t('monitor.detail.next.charts.title'), copy: t('monitor.detail.next.charts.copy'), meta: 'next' }
    ]);
  });

  it('builds monitor summary stats and meta rows', () => {
    const monitor = {
      id: 42,
      instance: '10.0.0.1',
      intervals: 60,
      scheduleType: 'interval',
      description: 'Core checkout monitor',
      labels: { region: 'cn', env: 'prod' },
      annotations: { owner: 'sre' },
      gmtCreate: 1712726400000,
      gmtUpdate: 1712730000000
    } as any;

    expect(formatMonitorSchedule(monitor, t)).toBe('60s');
    expect(
      buildMonitorSummaryStats(monitor, t)
    ).toEqual([
      { label: 'ID', value: '42' },
      { label: t('monitor.period'), value: '60s' },
      { label: t('label'), value: '2' },
      { label: t('annotation'), value: '1' }
    ]);
    expect(
      buildMonitorSummaryMetaRows(monitor, t, time => (time === 1712726400000 ? '2026-04-10 17:00:00' : '2026-04-10 18:00:00'))
    ).toEqual([
      { label: t('common.instance'), value: '10.0.0.1' },
      { label: t('monitor.detail.description'), value: 'Core checkout monitor' },
      { label: t('common.new-time'), value: '2026-04-10 17:00:00' },
      { label: t('common.edit-time'), value: '2026-04-10 18:00:00' }
    ]);
    expect(formatMonitorSchedule({ scheduleType: 'cron', cronExpression: '0 */5 * * * *' } as any, t)).toBe('0 */5 * * * *');
  });

  it('builds grafana rows from dashboard state', () => {
    expect(buildMonitorGrafanaRows({ enabled: true, url: 'https://grafana.example/dashboard' }, t)).toEqual([
      { title: t('monitor.detail.grafana.enabled.title'), copy: 'https://grafana.example/dashboard', meta: t('monitor.detail.grafana.enabled.meta') }
    ]);

    expect(buildMonitorGrafanaRows({ enabled: false }, t)).toEqual([
      { title: t('monitor.detail.grafana.empty.title'), copy: t('monitor.detail.grafana.empty.copy'), meta: '-' }
    ]);
  });

  it('builds runtime param and metric catalog rows', () => {
    expect(buildMonitorParamRows([{ field: 'host', paramValue: '10.0.0.1', display: true }] as any, t)).toEqual([
      { title: 'host', copy: '10.0.0.1', meta: t('monitor.detail.param.meta') }
    ]);

    expect(buildMonitorMetricCatalogRows([{ name: 'cpu', fields: [{ field: 'usage' }] }] as any, t)).toEqual([
      { key: 'cpu', title: 'cpu', copy: '1', meta: t('monitor.detail.metric.fields') }
    ]);

    expect(buildMonitorMetricFieldRows({ fields: [{ field: 'usage', unit: '%', type: 0 }] } as any, t)).toEqual([
      { title: 'usage', copy: '%', meta: t('monitor.detail.metric.numeric') }
    ]);

    expect(buildMonitorMetricPayloadRows({ current: 72, labels: { host: 'db-1' } }, t)).toEqual([
      { title: 'current', copy: '72', meta: t('monitor.detail.metric.payload.meta') },
      { title: 'labels', copy: '{"host":"db-1"}', meta: t('monitor.detail.metric.payload.meta') }
    ]);

    expect(
      buildMonitorMetricTableRows(
        {
          fields: [{ name: 'usage' }, { name: 'idle' }],
          valueRows: [{ labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: '28' }] }]
        } as any,
        t
      )
    ).toEqual([
      { title: 'host=db-1', copy: 'usage: 72 | idle: 28', meta: t('monitor.detail.metric.payload.meta') }
    ]);

    expect(
      buildMonitorMetricTableEvidenceRows(
        {
          fields: [{ name: 'usage' }, { name: 'idle' }],
          valueRows: [{ labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: '28' }] }]
        } as any,
        t
      )
    ).toEqual([
      { key: '0', title: 'host=db-1', copy: 'usage: 72 | idle: 28', meta: t('monitor.detail.metric.payload.meta') }
    ]);

    expect(
      buildMonitorMetricSelectedRowRows(
        {
          fields: [{ name: 'usage', unit: '%' }, { name: 'idle', unit: '%' }],
          valueRows: [{ labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: '28' }] }]
        } as any,
        0,
        t
      )
    ).toEqual([
      { title: t('common.labels'), copy: 'host=db-1', meta: t('monitor.detail.metric.payload.meta') },
      { title: 'usage', copy: '72', meta: '%' },
      { title: 'idle', copy: '28', meta: '%' }
    ]);

    expect(
      buildMonitorMetricSelectedRowTableRows(
        {
          fields: [{ name: 'usage', unit: '%' }, { name: 'idle', unit: '%' }],
          valueRows: [{ labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: null }] }]
        } as any,
        0,
        t
      )
    ).toEqual([
      { title: 'usage', copy: '72', meta: '%' },
      { title: 'idle', copy: 'NULL', meta: '%' }
    ]);

    expect(
      filterMonitorMetricCatalog(
        [
          { name: 'cpu', fields: [{ field: 'usage' }, { field: 'idle' }] },
          { name: 'memory', fields: [{ field: 'used' }] }
        ] as any,
        'idle'
      )
    ).toEqual([{ name: 'cpu', fields: [{ field: 'usage' }, { field: 'idle' }] }]);
  });

  it('builds realtime fact rows and table matrix', () => {
    const payload = {
      time: 1712730000000,
      fields: [{ name: 'usage', unit: '%' }, { name: 'idle', unit: '%' }],
      valueRows: [
        { labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: null }] },
        { labels: { host: 'db-2' }, values: [{ origin: '64' }, { origin: '36' }] }
      ]
    } as any;

    expect(buildMonitorMetricRealtimeFactRows(payload, t, () => '2026-04-10 18:00:00')).toEqual([
      { title: t('monitor.detail.metric.facts.time'), copy: '2026-04-10 18:00:00', meta: t('monitor.detail.metric.payload.meta') },
      { title: t('monitor.detail.metric.facts.fields'), copy: '2', meta: t('monitor.detail.metric.payload.meta') },
      { title: t('monitor.detail.metric.facts.rows'), copy: '2', meta: t('monitor.detail.metric.payload.meta') }
    ]);

    expect(buildMonitorMetricTableMatrix(payload, t)).toEqual({
      columns: [
        { key: 'usage', title: 'usage', unit: '%' },
        { key: 'idle', title: 'idle', unit: '%' }
      ],
      rows: [
        { key: '0', label: 'host=db-1', values: ['72', t('monitor.detail.value.null')] },
        { key: '1', label: 'host=db-2', values: ['64', '36'] }
      ]
    });

    expect(
      buildMonitorMetricTableMatrix(
        {
          fields: [{ name: 'status' }],
          valueRows: [{ labels: {}, values: [{ origin: 'UP' }] }]
        } as any,
        t
      ).rows
    ).toEqual([{ key: '0', label: 'Row 1', values: ['UP'] }]);

    expect(buildMonitorMetricRowNavigation(payload, '1', t)).toEqual({
      selectedIndex: 1,
      total: 2,
      selectedLabel: 'host=db-2',
      canPrevious: true,
      canNext: false
    });

    expect(
      filterMonitorMetricTableMatrix(buildMonitorMetricTableMatrix(payload, t), 'db-2')
    ).toEqual({
      columns: [
        { key: 'usage', title: 'usage', unit: '%' },
        { key: 'idle', title: 'idle', unit: '%' }
      ],
      rows: [{ key: '1', label: 'host=db-2', values: ['64', '36'] }]
    });

    expect(resolveMonitorMetricTableMode(payload, 'table')).toBe('table');
    expect(
      resolveMonitorMetricTableMode(
        {
          ...payload,
          valueRows: [{ labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: null }] }]
        } as any,
        'table'
      )
    ).toBe('detail');
  });

  it('builds point navigation for the selected history sample', () => {
    const payload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 },
          { mean: '35', min: '30', max: '39', time: 3 }
        ]
      }
    } as any;

    expect(buildMonitorHistoryPointNavigation(payload, 'host=db-1', 1, value => `t${value}`)).toEqual({
      selectedIndex: 1,
      total: 3,
      selectedLabel: 't2',
      canPrevious: true,
      canNext: true
    });

    expect(buildMonitorHistoryPointNavigation(payload, 'host=db-1', 0, value => `t${value}`)).toEqual({
      selectedIndex: 0,
      total: 3,
      selectedLabel: 't1',
      canPrevious: false,
      canNext: true
    });
  });

  it('builds history payload and series rows', () => {
    const payload = {
      metrics: 'cpu',
      field: { name: 'usage', unit: '%' },
      values: {
        'host=db-1': [
          { origin: '72', time: 1712730000000 },
          { origin: '71', time: 1712730060000 }
        ],
        'host=db-2': [{ origin: '65', time: 1712730120000 }]
      }
    } as any;

    expect(buildMonitorHistoryPayloadRows(payload, t, () => '2026-04-10 18:02:00')).toEqual([
      { title: t('monitor.detail.history-payload.series'), copy: '2', meta: t('monitor.detail.history-payload.meta') },
      { title: t('monitor.detail.history-payload.samples'), copy: '3', meta: t('monitor.detail.history-payload.meta') },
      { title: t('monitor.detail.history-payload.field'), copy: 'cpu.usage', meta: '%' },
      { title: t('monitor.detail.history-payload.latest'), copy: '2026-04-10 18:02:00', meta: t('monitor.detail.history-payload.meta') }
    ]);

    expect(buildMonitorHistorySeriesRows(payload, t, () => '2026-04-10 18:02:00')).toEqual([
      { key: 'host=db-1', title: 'host=db-1', copy: '71', meta: `2 ${t('monitor.detail.history-series.samples')} · 2026-04-10 18:02:00` },
      { key: 'host=db-2', title: 'host=db-2', copy: '65', meta: `1 ${t('monitor.detail.history-series.samples')} · 2026-04-10 18:02:00` }
    ]);

    expect(buildMonitorHistoryPointRows(payload, 'host=db-1', t, () => '2026-04-10 18:02:00')).toEqual([
      { title: '2026-04-10 18:02:00', copy: '71', meta: t('monitor.detail.history-points.meta', { index: 1 }) },
      { title: '2026-04-10 18:02:00', copy: '72', meta: t('monitor.detail.history-points.meta', { index: 2 }) }
    ]);

    expect(
      buildMonitorHistoryPointRows(
        {
          values: {
            'host=db-1': [{ mean: '71', min: '68', max: '75', time: 1712730060000 }]
          }
        } as any,
        'host=db-1',
        t,
        () => '2026-04-10 18:02:00',
        true
      )
    ).toEqual([{ title: '2026-04-10 18:02:00', copy: '71', meta: 'min 68 · max 75' }]);

    expect(
      buildMonitorHistorySeriesSummaryRows(
        {
          values: {
            'host=db-1': [
              { mean: '71', min: '68', max: '75', time: 1712730060000 },
              { mean: '70', min: '67', max: '74', time: 1712730000000 }
            ]
          }
        } as any,
        'host=db-1',
        t,
        () => '2026-04-10 18:02:00',
        true
      )
    ).toEqual([
      { title: t('monitor.detail.history-payload.series'), copy: 'host=db-1', meta: 'history summary' },
      { title: t('monitor.detail.history-payload.samples'), copy: '2', meta: 'history summary' },
      { title: 'Latest point', copy: '2026-04-10 18:02:00', meta: 'mean 71 · min 68 · max 75' }
    ]);
  });

  it('builds selectable history point rows and selected point detail rows', () => {
    const payload = {
      values: {
        'host=db-1': [
          { origin: '65', mean: '66', min: '62', max: '70', time: 1712730000000 },
          { origin: '72', mean: '71', min: '68', max: '75', time: 1712730060000 }
        ],
        'host=db-2': [
          { origin: '55', mean: '57', min: '51', max: '60', time: 1712730000000 },
          { origin: '63', mean: '64', min: '59', max: '68', time: 1712730060000 }
        ]
      }
    } as any;

    expect(buildMonitorHistoryPointEvidenceRows(payload, 'host=db-1', t, () => '2026-04-10 18:02:00', true)).toEqual([
      { key: '1', title: '2026-04-10 18:02:00', copy: '71', meta: 'min 68 · max 75' },
      { key: '0', title: '2026-04-10 18:02:00', copy: '66', meta: 'min 62 · max 70' }
    ]);

    expect(buildMonitorHistorySelectedPointRows(payload, 'host=db-1', 1, t, () => '2026-04-10 18:02:00', true)).toEqual([
      { title: t('monitor.detail.history-selected.time'), copy: '2026-04-10 18:02:00', meta: t('monitor.detail.history-selected.meta') },
      { title: t('monitor.detail.history-selected.mean'), copy: '71', meta: t('monitor.detail.history-selected.meta') },
      { title: t('monitor.detail.history-selected.min'), copy: '68', meta: t('monitor.detail.history-selected.meta') },
      { title: t('monitor.detail.history-selected.max'), copy: '75', meta: t('monitor.detail.history-selected.meta') }
    ]);

    expect(
      buildMonitorHistoryPointCompareRows(
        payload,
        ['host=db-1', 'host=db-2'],
        1,
        'host=db-1',
        t,
        () => '2026-04-10 18:02:00',
        true
      )
    ).toEqual([
      { key: 'host=db-1', title: 'host=db-1', copy: '71', meta: `${t('monitor.detail.history-compare.selected')} · min 68 · max 75 · 2026-04-10 18:02:00` },
      { key: 'host=db-2', title: 'host=db-2', copy: '64', meta: 'min 59 · max 68 · 2026-04-10 18:02:00' }
    ]);
  });

  it('builds history series navigation state', () => {
    expect(
      buildMonitorHistorySeriesNavigation(
        {
          values: {
            'host=db-1': [{ origin: '65', time: 1712730000000 }],
            'host=db-2': [{ origin: '72', time: 1712730060000 }],
            'host=db-3': [{ origin: '81', time: 1712730120000 }]
          }
        } as any,
        'host=db-2'
      )
    ).toEqual({
      selectedIndex: 1,
      total: 3,
      selectedLabel: 'host=db-2',
      canPrevious: true,
      canNext: true
    });

    expect(buildMonitorHistorySeriesNavigation({ values: {} } as any, null)).toEqual({
      selectedIndex: null,
      total: 0,
      selectedLabel: null,
      canPrevious: false,
      canNext: false
    });

    expect(
      buildMonitorHistorySeriesNavigation(
        {
          values: {
            'host=db-1': [{ origin: '65', time: 1712730000000 }],
            'host=db-2': [{ origin: '72', time: 1712730060000 }]
          }
        } as any,
        'host=db-2',
        ['host=db-2']
      )
    ).toEqual({
      selectedIndex: 0,
      total: 1,
      selectedLabel: 'host=db-2',
      canPrevious: false,
      canNext: false
    });
  });

  it('builds history series selector rows with aggregated semantics', () => {
    expect(
      buildMonitorHistorySeriesSelectorRows(
        {
          values: {
            'host=db-1': [
              { origin: '65', mean: '66', min: '62', max: '70', time: 1712730000000 },
              { origin: '72', mean: '71', min: '68', max: '75', time: 1712730060000 }
            ],
            'host=db-2': [
              { origin: '48', mean: '50', min: '42', max: '58', time: 1712730060000 }
            ]
          }
        } as any,
        t,
        () => '2026-04-10 18:02:00',
        true
      )
    ).toEqual([
      { key: 'host=db-1', title: 'host=db-1', copy: '71', meta: 'min 68 · max 75 · 2026-04-10 18:02:00' },
      { key: 'host=db-2', title: 'host=db-2', copy: '50', meta: 'min 42 · max 58 · 2026-04-10 18:02:00' }
    ]);
  });

  it('builds favorite jump rows for realtime and history metrics', () => {
    expect(
      buildMonitorFavoriteJumpRows(
        ['cpu', 'cpu.usage'],
        [{ name: 'cpu', fields: [{ field: 'usage' }] }] as any,
        [{ metrics: 'cpu', metric: 'usage', unit: '%' }] as any,
        t
      )
    ).toEqual([
      {
        key: 'realtime:cpu',
        title: 'cpu',
        copy: t('monitor.detail.favorite.realtime.copy'),
        meta: t('monitor.detail.favorite.realtime.meta'),
        targetKey: 'cpu',
        targetKind: 'realtime',
        favoriteToken: 'cpu'
      },
      {
        key: 'history:cpu.usage',
        title: 'cpu.usage',
        copy: '%',
        meta: t('monitor.detail.favorite.history.meta'),
        targetKey: 'cpu:usage',
        targetKind: 'history',
        favoriteToken: 'cpu.usage'
      }
    ]);
  });

  it('keeps monitor favorites aligned to Angular Set semantics', () => {
    expect(normalizeMonitorFavoriteNames(['cpu', 'cpu', '', undefined, 'cpu.usage', 'cpu.usage'])).toEqual(['cpu', 'cpu.usage']);
    expect(
      buildMonitorFavoriteJumpRows(
        ['cpu', 'cpu', 'cpu.usage', 'cpu.usage'],
        [{ name: 'cpu', fields: [{ field: 'usage' }] }] as any,
        [{ metrics: 'cpu', metric: 'usage', unit: '%' }] as any,
        t
      ).map(row => row.key)
    ).toEqual(['realtime:cpu', 'history:cpu.usage']);
  });

  it('filters history metric catalog and history series rows by search text', () => {
    expect(
      filterMonitorHistoryMetricCatalog(
        [
          { metrics: 'website.summary', metric: 'responseTime', unit: 'ms' },
          { metrics: 'website.summary', metric: 'status', unit: 'count' }
        ],
        'ms'
      )
    ).toEqual([{ metrics: 'website.summary', metric: 'responseTime', unit: 'ms' }]);

    expect(
      filterMonitorHistorySeriesRows(
        [
          { key: 'host=db-1', title: 'host=db-1', copy: '71', meta: '2 samples · 2026-04-10 18:02:00' },
          { key: 'host=cache-1', title: 'host=cache-1', copy: '65', meta: '1 samples · 2026-04-10 18:02:00' }
        ],
        'cache'
      )
    ).toEqual([{ key: 'host=cache-1', title: 'host=cache-1', copy: '65', meta: '1 samples · 2026-04-10 18:02:00' }]);
  });

  it('reconciles and toggles visible history series keys safely', () => {
    expect(resolveMonitorHistoryVisibleSeriesKeys(['mean', 'max'], ['mean', 'min', 'max'])).toEqual(['mean', 'max']);
    expect(resolveMonitorHistoryVisibleSeriesKeys(['origin'], ['mean', 'min', 'max'])).toEqual(['mean', 'min', 'max']);
    expect(toggleMonitorHistoryVisibleSeriesKey(['mean', 'min', 'max'], 'min', ['mean', 'min', 'max'])).toEqual(['mean', 'max']);
    expect(toggleMonitorHistoryVisibleSeriesKey(['mean'], 'mean', ['mean', 'min', 'max'])).toEqual(['mean']);
    expect(toggleMonitorHistoryVisibleSeriesKey(['mean'], 'max', ['mean', 'min', 'max'])).toEqual(['mean', 'max']);
  });
});
