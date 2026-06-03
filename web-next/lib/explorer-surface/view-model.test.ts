import { describe, expect, it, vi } from 'vitest';
import { buildExplorerFilters, buildExplorerResultRows, buildExplorerSurfaceConfig, explorerSignalTone } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

const t = createTranslatorMock({ locale: 'zh-CN', overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] });

describe('explorer surface config', () => {
  it('builds explorer surface config', () => {
    const config = buildExplorerSurfaceConfig(t);
    expect(config.title).toBe(t('explorer.title'));
    expect(config.tags).toEqual([
      t('explorer.tags.unified-query'),
      t('explorer.tags.context-retention'),
      t('explorer.tags.cross-signal-search')
    ]);
    expect(config.actions).toHaveLength(3);
    expect(config.checklist.map(item => item.meta)).toEqual([
      t('explorer.checklist.entry.meta'),
      t('explorer.checklist.adapters.meta'),
      t('explorer.checklist.links.meta')
    ]);
    expect(config.lanes[0].meta).toBe(t('explorer.lanes.query.meta'));
  });

  it('builds localized cold Workbench explorer rows', () => {
    expect(buildExplorerResultRows(t)).toEqual([
      {
        key: 'trace-checkout',
        signalKey: 'trace',
        signalTone: 'trace',
        href: '/trace/manage?serviceName=checkout',
        signal: t('explorer.rows.trace.signal'),
        service: 'checkout',
        operation: 'POST /checkout',
        status: t('explorer.status.error'),
        duration: '1.25s',
        timestamp: '2026-03-30 11:50:57'
      },
      {
        key: 'log-payment',
        signalKey: 'log',
        signalTone: 'log',
        href: '/log/manage?search=payment',
        signal: t('explorer.rows.log.signal'),
        service: 'payment',
        operation: t('explorer.rows.log.operation'),
        status: t('explorer.status.error'),
        duration: '-',
        timestamp: '2026-03-30 11:50:57'
      },
      {
        key: 'metric-frontend',
        signalKey: 'metric',
        signalTone: 'metric',
        href: '/ingestion/otlp/metrics?serviceName=frontend',
        signal: t('explorer.rows.metric.signal'),
        service: 'frontend',
        operation: 'http.server.duration',
        status: t('explorer.status.normal'),
        duration: '0.88ms',
        timestamp: '2026-03-30 11:50:58'
      }
    ]);
  });

  it('keeps signal tone stable across localized signal labels', () => {
    expect(explorerSignalTone('trace')).toBe('trace');
    expect(explorerSignalTone('log')).toBe('log');
    expect(explorerSignalTone('metric')).toBe('metric');
  });

  it('builds quick filters for a cross-signal query surface', () => {
    expect(buildExplorerFilters(t)).toEqual([
      {
        title: t('explorer.filters.signal-type'),
        values: [
          t('explorer.rows.trace.signal'),
          t('explorer.rows.log.signal'),
          t('explorer.rows.metric.signal'),
          t('explorer.rows.exception.signal')
        ]
      },
      { title: t('explorer.filters.deployment-environment'), values: ['demo', 'prod'] },
      { title: t('explorer.filters.service-name'), values: ['checkout', 'frontend', 'payment', 'cart'] },
      { title: t('explorer.filters.status'), values: [t('explorer.status.error'), t('explorer.status.normal')] }
    ]);
  });
});
