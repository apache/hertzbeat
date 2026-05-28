import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorMetricTable } from './monitor-metric-table';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

describe('monitor metric table', () => {
  it('renders headers, null markers, and selected row state', () => {
    const html = renderToStaticMarkup(
      <MonitorMetricTable
        payload={{
          fields: [{ name: 'usage', unit: '%' }, { name: 'idle' }],
          valueRows: [
            { labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: null }] },
            { labels: { host: 'db-2' }, values: [{ origin: '64' }, { origin: '36' }] }
          ]
        } as any}
        selectedRowKey="1"
        onSelect={() => {}}
        t={t}
      />
    );

    expect(html).toContain('usage');
    expect(html).toContain('%');
    expect(html).toContain('NULL');
    expect(html).toContain('host=db-2');
    expect(html).toContain('data-monitor-metric-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-monitor-metric-unit-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-hz-data-meta-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-hz-row-selected="true"');
    expect(html).not.toContain('data-selected="true"');
    expect(html).not.toContain('var(--ops-border-color)');
    expect(html).not.toContain('var(--ops-surface-panel)');
  });

  it('renders focused-row detail mode', () => {
    const html = renderToStaticMarkup(
      <MonitorMetricTable
        payload={{
          fields: [{ name: 'usage', unit: '%' }, { name: 'idle', unit: '%' }],
          valueRows: [
            { labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: null }] },
            { labels: { host: 'db-2' }, values: [{ origin: '64' }, { origin: '36' }] }
          ]
        } as any}
        selectedRowKey="1"
        onSelect={() => {}}
        mode="detail"
        t={t}
      />
    );

    expect(html).toContain('Row');
    expect(html).toContain('host=db-2');
    expect(html).toContain('usage');
    expect(html).toContain('64');
    expect(html).toContain('idle');
    expect(html).toContain('36');
    expect(html).toContain('data-monitor-metric-detail-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-monitor-metric-row-meta-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-hz-data-meta-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).not.toContain('ObservabilityDetailRows');
    expect(html).not.toContain('var(--ops-border-color)');
  });

  it('does not keep monitor metric table meta text as page-local utility classes', () => {
    const source = require('node:fs').readFileSync(require('node:path').resolve(__dirname, 'monitor-metric-table.tsx'), 'utf8');

    expect(source).toContain('HzDataMetaText');
    expect(source).toContain('spacing="inline"');
    expect(source).toContain('spacing="compact"');
    expect(source).not.toContain('ml-2 text-[10px] uppercase tracking-[0.12em] text-[#727b8c]');
    expect(source).not.toContain('ml-1 text-[10px] tracking-normal text-[#727b8c]');
    expect(source).not.toContain('className="ml-2"');
    expect(source).not.toContain('className="ml-1"');
  });
});
