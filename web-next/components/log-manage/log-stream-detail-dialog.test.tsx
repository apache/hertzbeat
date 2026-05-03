import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LogStreamDetailDialog } from './log-stream-detail-dialog';

describe('log stream detail dialog', () => {
  it('renders facts and toolbar actions for the selected stream log', () => {
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
            meta: '缺少实体 ID，实体详情会保持禁用'
          },
          {
            key: 'hertzbeat.collector',
            label: 'hertzbeat.collector',
            value: 'collector-local',
            state: 'present',
            meta: '采集器来源'
          }
        ]}
        actions={<button type="button">Open Related Trace</button>}
        rows={[{ title: 'checkout', copy: 'timeout on db', meta: 'trace-123' }]}
        json='{"traceId":"trace-123"}'
      />
    );

    expect(html).toContain('data-log-stream-detail-dialog="true"');
    expect(html).toContain('data-log-stream-detail-trace-id="trace-123"');
    expect(html).toContain('data-log-stream-detail-selection="attached"');
    expect(html).toContain('data-log-stream-detail-facts="true"');
    expect(html).toContain('data-log-stream-detail-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(html).toContain('data-log-stream-detail-attribution-diagnostic-state="missing"');
    expect(html).toContain('归因诊断');
    expect(html).toContain('hertzbeat.entity_id');
    expect(html).toContain('缺少实体 ID，实体详情会保持禁用');
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
