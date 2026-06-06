// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { LogStreamDetailDialog } from './log-stream-detail-dialog';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container?.remove();
  container = null;
});

describe('log stream detail dialog', () => {
  it('renders facts and toolbar actions for the selected stream log', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const missingEntityCopy = 'Missing entity ID; entity detail remains disabled';
    const html = renderToStaticMarkup(
      <LogStreamDetailDialog
        open={true}
        onClose={() => undefined}
        title="Selected Log"
        subtitle="ERROR · checkout timeout"
        traceId="trace-123"
        selectionState="attached"
        badges={['JSON']}
        metaItems={['traceId · trace-123']}
        warning="Detached stream selection"
        facts={[
          { label: 'Severity', value: 'ERROR' },
          { label: 'Timestamp', value: '2026-04-10 10:00:00' },
          { label: 'Trace ID', value: 'trace-123', monospace: true }
        ]}
        attributionDiagnostics={[
          {
            key: 'hertzbeat.entity_id',
            label: 'hertzbeat.entity_id',
            value: '-',
            state: 'missing',
            meta: missingEntityCopy
          },
          {
            key: 'hertzbeat.collector',
            label: 'hertzbeat.collector',
            value: 'collector-local',
            state: 'present',
            meta: 'Collector source'
          }
        ]}
        actions={<button type="button">Open Related Trace</button>}
        rows={[{ title: 'checkout', copy: 'timeout on db', meta: 'trace-123' }]}
        metricsRows={[{ title: 'Pod', copy: 'checkout-7d9', meta: 'k8s.pod.name' }]}
        metricsHref="/ingestion/otlp/metrics?serviceName=checkout"
        contextRows={[
          {
            key: 'selected',
            relation: 'selected',
            relationLabel: t('log.manage.stream.detail.context.selected'),
            time: '2026-04-10 10:00:00',
            severity: 'ERROR',
            body: 'timeout on db',
            service: 'checkout'
          }
        ]}
        json='{"traceId":"trace-123"}'
        raw="timeout on db"
        onCopyJson={() => undefined}
        onCopyRaw={() => undefined}
      />
    );

    expect(html).toContain('data-log-stream-detail-dialog="true"');
    expect(html).toContain('data-log-stream-detail-dialog-body-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-hz-ui="dialog-body-layout"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="stack"');
    expect(html).toContain('data-log-stream-detail-trace-id="trace-123"');
    expect(html).toContain('data-log-stream-detail-selection="attached"');
    expect(html).toContain('data-log-stream-detail-section-nav="true"');
    expect(html).toContain('data-log-stream-detail-section-nav-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('aria-label="' + t('log.manage.stream.detail.section.nav') + '"');
    expect(html).toContain('data-log-stream-detail-section-nav-item="overview"');
    expect(html).toContain('data-log-stream-detail-section-nav-item="json"');
    expect(html).toContain('data-log-stream-detail-section-nav-item="context"');
    expect(html).toContain('data-log-stream-detail-section-nav-item="metrics"');
    expect(html).toContain('data-log-stream-detail-section-nav-item-owner="hertzbeat-ui-button-link"');
    expect(html).toContain('data-hz-ui="button-link"');
    expect(html).toContain('href="#log-detail-section-overview"');
    expect(html).toContain('href="#log-detail-section-json"');
    expect(html).toContain('href="#log-detail-section-context"');
    expect(html).toContain('href="#log-detail-section-metrics"');
    const sectionNavOrder = ['overview', 'json', 'context', 'metrics'].map(section =>
      html.indexOf(`data-log-stream-detail-section-nav-item="${section}"`)
    );
    expect(sectionNavOrder.every(index => index >= 0)).toBe(true);
    expect(sectionNavOrder).toEqual([...sectionNavOrder].sort((left, right) => left - right));
    expect(html).toContain('data-log-stream-detail-section="overview"');
    expect(html).toContain('data-log-stream-detail-section="json"');
    expect(html).toContain('data-log-stream-detail-section="context"');
    expect(html).toContain('data-log-stream-detail-section="metrics"');
    expect(html).toContain('data-log-stream-detail-section-owner="hertzbeat-ui-section"');
    expect(html).toContain(t('log.manage.stream.detail.section.overview'));
    expect(html).toContain(t('log.manage.stream.detail.section.json'));
    expect(html).toContain(t('log.manage.stream.detail.section.context'));
    expect(html).toContain(t('log.manage.stream.detail.section.metrics'));
    expect(html).toContain('data-log-stream-detail-warning-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-log-stream-detail-warning="attached-state-warning"');
    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).toContain('data-hz-state-tone="warning"');
    expect(html).toContain('data-hz-state-variant="embedded"');
    expect(html).toContain('Detached stream selection');
    expect(html).toContain('data-log-stream-detail-facts="true"');
    expect(html).toContain('data-log-stream-detail-facts-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-log-stream-detail-row-list-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-hz-ui="detail-rows"');
    expect(html).toContain('data-log-stream-detail-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(html).toContain('data-log-stream-detail-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-ui="attribute-diagnostics"');
    expect(html).toContain('data-log-stream-detail-attribution-diagnostic-state="missing"');
    expect(html).toContain('data-log-stream-detail-toolbar-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-hz-ui="chip-group"');
    expect(html).toContain('data-hz-chip-group-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-log-stream-detail-toolbar-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-log-stream-detail-toolbar-meta-owner="hertzbeat-ui-inline-context-mark"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-ui="inline-context-mark"');
    expect(html).toContain('data-log-stream-detail-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-log-stream-detail-actions="dialog-actions"');
    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain(t('log.manage.stream.detail.attribution-title'));
    expect(html).toContain('hertzbeat.entity_id');
    expect(html).toContain(missingEntityCopy);
    expect(html).toContain('hertzbeat.collector');
    expect(html).toContain('collector-local');
    expect(html).toContain('Severity');
    expect(html).toContain('ERROR');
    expect(html).toContain('Open Related Trace');
    expect(html).toContain('trace-123');
    expect(html).toContain('JSON');
    expect(html).toContain('traceId · trace-123');
    expect(html).toContain('data-log-stream-detail-json-toolbar="json-copy-actions"');
    expect(html).toContain('data-log-stream-detail-json-toolbar-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-log-stream-detail-json-copy-action="json"');
    expect(html).toContain('data-log-stream-detail-raw-copy-action="raw"');
    expect(html).toContain(t('log.manage.stream.detail.copy-json'));
    expect(html).toContain(t('log.manage.stream.detail.copy-raw'));
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('<footer');
    expect(html).not.toContain('>Close</button>');
    expect(html).not.toContain('#f3eee6');
    expect(html).not.toContain('border-white/8');
  });

  it('filters log attributes by name and value inside the detail dialog', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <LogStreamDetailDialog
          open={true}
          onClose={() => undefined}
          title="Selected Log"
          subtitle="ERROR · checkout timeout"
          rows={[{ title: 'checkout', copy: 'timeout on db' }]}
          attributeRows={[
            { key: 'attribute-region', source: 'Attribute', name: 'region', value: 'cn' },
            { key: 'attribute-http.route', source: 'Attribute', name: 'http.route', value: '/checkout/:id' },
            { key: 'resource-service.name', source: 'Resource', name: 'service.name', value: 'checkout' }
          ]}
        />
      );
      await Promise.resolve();
    });

    const searchInput = container.querySelector('[data-log-stream-detail-attribute-search="true"]') as HTMLInputElement | null;
    expect(searchInput).toBeTruthy();
    expect(searchInput?.getAttribute('data-log-stream-detail-attribute-search-owner')).toBe('hertzbeat-ui-input');
    expect(searchInput?.getAttribute('aria-label')).toBe(t('log.manage.stream.detail.attribute-search.aria'));

    await act(async () => {
      setNativeInputValue(searchInput!, 'route');
      await Promise.resolve();
    });

    expect(container.textContent).toContain('http.route');
    expect(container.textContent).toContain('/checkout/:id');
    expect(container.textContent).not.toContain('service.name');
    expect(container.textContent).not.toContain('region');

    await act(async () => {
      setNativeInputValue(searchInput!, 'missing-field');
      await Promise.resolve();
    });

    expect(container.querySelector('[data-log-stream-detail-attributes-empty="filtered"]')).toBeTruthy();
    expect(container.textContent).toContain(t('log.manage.stream.detail.attribute-search.empty'));
  });

  it('toggles JSON wrapping without changing copy payloads', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const onCopyJson = vi.fn();
    const onCopyRaw = vi.fn();
    const json = '{"body":"checkout timed out while waiting for inventory allocation","traceId":"trace-123"}';
    const raw = 'checkout timed out while waiting for inventory allocation';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <LogStreamDetailDialog
          open={true}
          onClose={() => undefined}
          title="Selected Log"
          rows={[{ title: 'checkout', copy: raw }]}
          json={json}
          raw={raw}
          onCopyJson={onCopyJson}
          onCopyRaw={onCopyRaw}
        />
      );
      await Promise.resolve();
    });

    const jsonSection = container.querySelector('[data-log-stream-detail-json-section="true"]');
    const wrapToggle = container.querySelector('[data-log-stream-detail-json-wrap-action="toggle"]') as HTMLButtonElement | null;
    expect(jsonSection?.getAttribute('data-log-stream-detail-json-wrap-state')).toBe('scroll');
    expect(wrapToggle).toBeTruthy();
    expect(wrapToggle?.getAttribute('data-log-stream-detail-json-wrap-owner')).toBe('hertzbeat-ui-button');
    expect(wrapToggle?.getAttribute('aria-label')).toBe(t('log.manage.stream.detail.wrap-json.aria'));
    expect(wrapToggle?.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      wrapToggle?.click();
      await Promise.resolve();
    });

    expect(jsonSection?.getAttribute('data-log-stream-detail-json-wrap-state')).toBe('wrapped');
    expect(wrapToggle?.getAttribute('aria-pressed')).toBe('true');

    const copyJson = container.querySelector('[data-log-stream-detail-json-copy-action="json"]') as HTMLButtonElement | null;
    const copyRaw = container.querySelector('[data-log-stream-detail-raw-copy-action="raw"]') as HTMLButtonElement | null;
    await act(async () => {
      copyJson?.click();
      copyRaw?.click();
      await Promise.resolve();
    });

    expect(onCopyJson).toHaveBeenCalledWith(json);
    expect(onCopyRaw).toHaveBeenCalledWith(raw);
  });
});
