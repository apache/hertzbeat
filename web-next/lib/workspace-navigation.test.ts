import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../test/i18n-test-helper';
import {
  buildEntityEditorWorkspaceTabs,
  buildEntitySignalRouteContext,
  buildEntityWorkspaceHref,
  buildEntityWorkspaceTabs,
  buildSignalWorkspaceTabs
} from './workspace-navigation';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('workspace navigation', () => {
  it('prefers the explicit return path for entity workspace navigation', () => {
    expect(
      buildEntityWorkspaceHref({
        returnTo: '/entities/88?tab=logs',
        entityId: '88'
      })
    ).toBe('/entities/88?tab=logs');
  });

  it('builds signal tabs with preserved context for the shared workbench shell', () => {
    const tabs = buildSignalWorkspaceTabs({
      t,
      active: 'traces',
      routeContext: {
        entityId: '7',
        entityName: 'checkout',
        returnTo: '/entities/7',
        serviceNamespace: 'payments'
      },
      logQuery: {
        search: '',
        logContent: '',
        traceId: 'trace-123',
        spanId: 'span-456',
        severityNumber: '',
        severityText: 'ERROR'
      },
      logView: 'stream',
      traceQuery: {
        traceId: 'trace-123',
        spanId: 'span-456',
        serviceName: 'checkout',
        errorOnly: true
      },
      metricsQuery: {
        traceId: 'trace-123',
        spanId: 'span-456',
        serviceName: 'checkout',
        serviceNamespace: 'payments'
      },
      monitorContext: {
        serviceName: 'checkout'
      }
    });

    const logsTab = tabs.find(tab => tab.key === 'logs');
    const tracesTab = tabs.find(tab => tab.key === 'traces');
    const metricsTab = tabs.find(tab => tab.key === 'metrics');
    const ingestionTab = tabs.find(tab => tab.key === 'ingestion');
    const monitorsTab = tabs.find(tab => tab.key === 'monitors');

    expect(tabs.map(tab => tab.label)).toEqual([
      t('entity.detail'),
      t('otlp.title'),
      t('ingestion.otlp.metrics.title'),
      t('log.manage.console.title'),
      t('trace.manage.workspace'),
      t('menu.monitor.center')
    ]);
    expect(logsTab?.href).toContain('/log/manage?');
    expect(logsTab?.href).toContain('traceId=trace-123');
    expect(logsTab?.href).toContain('severityText=ERROR');
    expect(logsTab?.href).toContain('view=stream');
    expect(logsTab?.href).toContain('entityId=7');

    expect(tracesTab?.active).toBe(true);
    expect(tracesTab?.href).toContain('errorOnly=true');
    expect(tracesTab?.href).toContain('serviceName=checkout');

    expect(ingestionTab?.href).toContain('/ingestion/otlp?');
    expect(ingestionTab?.href).toContain('traceId=trace-123');
    expect(ingestionTab?.href).toContain('entityId=7');

    expect(metricsTab?.href).toContain('/ingestion/otlp/metrics?');
    expect(metricsTab?.href).toContain('spanId=span-456');
    expect(metricsTab?.href).toContain('serviceNamespace=payments');

    expect(monitorsTab?.href).toContain('/monitors?');
    expect(monitorsTab?.href).toContain('serviceName=checkout');
  });

  it('falls back to the shared trace workspace label when the legacy key is missing', () => {
    const tabs = buildSignalWorkspaceTabs({
      t: (key: string) => {
        if (key === 'trace.center.console.title') return '';
        if (key === 'trace.manage.workspace') return 'Traces Workbench';
        return key;
      },
      active: 'traces',
      routeContext: {},
      logQuery: {
        search: '',
        logContent: '',
        traceId: '',
        spanId: '',
        severityNumber: '',
        severityText: ''
      },
      traceQuery: {
        traceId: '',
        spanId: '',
        serviceName: '',
        errorOnly: false
      },
      metricsQuery: {}
    });

    expect(tabs.find(tab => tab.key === 'traces')?.label).toBe('Traces Workbench');
  });

  it('builds entity route context with a default return path to entity detail', () => {
    expect(
      buildEntitySignalRouteContext({
        entityId: 42,
        entityName: 'Checkout API'
      })
    ).toEqual({
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42',
      serviceName: undefined,
      serviceNamespace: undefined,
      environment: undefined
    });
  });

  it('orders entity workspace tabs like the Angular workbench and preserves entity context', () => {
    const tabs = buildEntityWorkspaceTabs({
      t,
      active: 'entity',
      routeContext: buildEntitySignalRouteContext({
        entityId: 7,
        entityName: 'checkout'
      })
    });

    expect(tabs.map(tab => tab.key)).toEqual(['entity', 'metrics', 'monitors', 'logs', 'traces']);
    expect(tabs.map(tab => tab.label)).toEqual([
      t('entity.detail'),
      t('ingestion.otlp.metrics.title'),
      t('menu.monitor.center'),
      t('log.manage.console.title'),
      t('trace.manage.workspace')
    ]);
    expect(tabs[2]?.href).toContain('/monitors?');
    expect(tabs[2]?.href).toContain('entityId=7');
    expect(tabs[3]?.href).toContain('/log/manage?');
    expect(tabs[4]?.href).toContain('/trace/manage?');
  });

  it('disables non-entity tabs in entity editor create mode until an entity exists', () => {
    const tabs = buildEntityEditorWorkspaceTabs({
      t,
      entityId: undefined,
      entityName: 'draft-entity'
    });

    expect(tabs.map(tab => tab.key)).toEqual(['entity', 'monitors', 'logs', 'traces']);
    expect(tabs.map(tab => tab.label)).toEqual([
      t('entity.detail'),
      t('menu.monitor.center'),
      t('log.manage.console.title'),
      t('trace.manage.workspace')
    ]);
    expect(tabs.find(tab => tab.key === 'entity')?.active).toBe(true);
    expect(tabs.find(tab => tab.key === 'monitors')?.disabled).toBe(true);
    expect(tabs.find(tab => tab.key === 'logs')?.disabled).toBe(true);
    expect(tabs.find(tab => tab.key === 'traces')?.disabled).toBe(true);
  });
});
