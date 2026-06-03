import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { LogStreamDetailDialog } from './log-stream-detail-dialog';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

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
        json='{"traceId":"trace-123"}'
      />
    );

    expect(html).toContain('data-log-stream-detail-dialog="true"');
    expect(html).toContain('data-log-stream-detail-dialog-body-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-hz-ui="dialog-body-layout"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="stack"');
    expect(html).toContain('data-log-stream-detail-trace-id="trace-123"');
    expect(html).toContain('data-log-stream-detail-selection="attached"');
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
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('<footer');
    expect(html).not.toContain('>Close</button>');
    expect(html).not.toContain('#f3eee6');
    expect(html).not.toContain('border-white/8');
  });
});
