import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { LogRelatedTraceDialog } from './log-related-trace-dialog';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

describe('log related trace dialog', () => {
  it('renders the preview toolbar, stage facts, and full-trace follow-up action', () => {
    const html = renderToStaticMarkup(
      <LogRelatedTraceDialog
        open={true}
        onClose={() => undefined}
        title="checkout span"
        subtitle="checkout"
        badges={['SPAN']}
        metaItems={['trace-123', '4 spans']}
        headerAction={<button type="button">View Full Trace</button>}
        rows={[
          {
            key: 'span-1',
            title: 'db.query',
            copy: 'checkout · ERROR',
            meta: '120ms',
            durationLabel: '120ms',
            leftPct: 0,
            widthPct: 78,
            depth: 0,
            tone: 'danger',
            events: [
              {
                key: 'span-1:event:0',
                label: 'exception',
                leftPct: 42,
                tone: 'danger',
                offsetLabel: '+72 ms',
                attributesLabel: 'exception.type=TimeoutError'
              }
            ]
          },
          {
            key: 'span-2',
            title: 'http.request',
            copy: 'checkout · OK',
            meta: '12ms',
            durationLabel: '12ms',
            leftPct: 80,
            widthPct: 12,
            depth: 1,
            tone: 'default'
          }
        ]}
        selectedKey="span-1"
        selectedEventKey="span-1:event:0"
        onSelect={() => undefined}
        timelineTicks={[
          { percent: 0, label: '0 ms' },
          { percent: 50, label: '60 ms' },
          { percent: 100, label: '120 ms' }
        ]}
        stageMeta={['checkout', '120ms', 'span-1...']}
        stageFacts={[
          { label: 'Current Span', value: 'db.query', tone: 'accent' },
          { label: 'Error Spans', value: '1', tone: 'error' },
          { label: 'Events', value: '3', tone: 'default' },
          { label: 'Links', value: '2', tone: 'default' }
        ]}
        selectedFacts={[{ title: 'db.query', copy: 'Span · ERROR', meta: '120ms' }]}
      />
    );

    expect(html).toContain('data-log-related-trace-dialog="true"');
    expect(html).toContain('data-log-related-trace-dialog-body-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-hz-ui="dialog-body-layout"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="stack"');
    expect(html).toContain('data-log-related-trace-toolbar="true"');
    expect(html).toContain('data-log-related-trace-toolbar-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-hz-ui="chip-group"');
    expect(html).toContain('data-hz-chip-group-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-log-related-trace-toolbar-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-log-related-trace-toolbar-meta-owner="hertzbeat-ui-inline-context-mark"');
    expect(html).toContain('data-log-related-trace-subtitle-owner="hertzbeat-ui-inline-context-mark"');
    expect(html).toContain('data-log-related-trace-subtitle="dialog-context"');
    expect(html).toContain('data-log-related-trace-header-action-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-log-related-trace-header-action="full-trace"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-ui="inline-context-mark"');
    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('trace-123');
    expect(html).toContain('4 spans');
    expect(html).toContain('View Full Trace');
    expect(html).toContain('db.query');
    expect(html).toContain('Duration');
    expect(html).toContain('Timeline');
    expect(html).toContain('rgba(197,96,104,0.92)');
    expect(html).toContain('data-waterfall-event-marker="true"');
    expect(html).toContain('data-waterfall-event-marker-action="select-span-event"');
    expect(html).toContain('data-log-related-trace-event-detail="span-event-detail"');
    expect(html).toContain('data-log-related-trace-event-detail-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-log-related-trace-event-detail-copy="span-event-not-span"');
    expect(html).toContain('data-log-related-trace-event-detail-meta="span-event-label"');
    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).toContain('data-hz-state-variant="hint"');
    expect(html).toContain('跨度事件');
    expect(html).toContain('不是新的跨度，是当前跨度上的时间点');
    expect(html).toContain('所属跨度');
    expect(html).toContain('事件位置');
    expect(html).toContain('+72 ms');
    expect(html).toContain('exception.type=TimeoutError');
    expect(html).toContain('查看跨度');
    expect(html).toContain('data-waterfall-minimap-event-marker="true"');
    expect(html).toContain('aria-label="exception"');
    expect(html).toContain('data-log-related-trace-stage-meta="true"');
    expect(html).toContain('data-log-related-trace-stage-meta-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-log-related-trace-stage-meta-item-owner="hertzbeat-ui-inline-context-mark"');
    expect(html).toContain('checkout');
    expect(html).toContain('span-1...');
    expect(html).toContain('data-log-related-trace-stage-facts="true"');
    expect(html).toContain('data-log-related-trace-stage-facts-layout="shared-stat-strip"');
    expect(html).toContain('data-log-related-trace-stage-facts-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-hz-ui="stat-strip"');
    expect(html).toContain('data-hz-stat-strip-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-hz-stat-strip-columns="4"');
    expect(html).toContain('data-log-related-trace-stage-fact-owner="hertzbeat-ui-stat-cell"');
    expect(html).toContain('data-hz-ui="stat-cell"');
    expect(html).toContain('data-log-related-trace-selected-facts-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-log-related-trace-body-layout-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-log-related-trace-body-layout="split-detail"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="split-detail"');
    expect(html).toContain('data-log-related-trace-side-stack-owner="hertzbeat-ui-dialog-body-layout"');
    expect(html).toContain('data-log-related-trace-side-stack="selected-facts"');
    expect(html).toContain('data-hz-dialog-body-layout-variant="side-stack"');
    expect(html).toContain('data-hz-ui="detail-rows"');
    expect(html).toContain('Current Span');
    expect(html).toContain('Error Spans');
    expect(html).toContain('Events');
    expect(html).toContain('Links');
    expect(html).toContain('xl:grid-cols-[minmax(0,1fr)_300px]');
    expect(html).not.toContain('xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]');
    expect(html).not.toContain('bg-[rgba(78,116,248,0.08)]');
    expect(html).not.toContain('bg-[rgba(216,111,91,0.08)]');
    expect(html).toContain('0 ms');
    expect(html).toContain('120 ms');
    expect(html).toContain('data-hz-stat-variant="tile"');
    expect(html).toContain('data-hz-stat-tone="critical"');
    expect(html).toContain('data-hz-stat-tone="info"');
    expect(html).not.toContain('<footer');
    expect(html).not.toContain('>Close</button>');
    expect(html).not.toContain('border-white/8');
    expect(html).not.toContain('text-white/45');
  });

  it('renders catalog-backed default loading and empty states', () => {
    const loadingHtml = renderToStaticMarkup(
      <LogRelatedTraceDialog
        open={true}
        onClose={() => undefined}
        title="trace preview"
        loading={true}
        rows={[]}
        selectedFacts={[]}
        onSelect={() => undefined}
      />
    );

    expect(loadingHtml).toContain('Loading trace preview');
    expect(loadingHtml).toContain('Loading the trace preview from the current log context.');

    const emptyHtml = renderToStaticMarkup(
      <LogRelatedTraceDialog
        open={true}
        onClose={() => undefined}
        title="trace preview"
        rows={[]}
        selectedFacts={[]}
        onSelect={() => undefined}
      />
    );

    expect(emptyHtml).toContain('No related trace');
    expect(emptyHtml).toContain('This log has no trace details available for preview.');
    expect(emptyHtml).toContain('data-log-related-trace-dialog="true"');
  });
});
