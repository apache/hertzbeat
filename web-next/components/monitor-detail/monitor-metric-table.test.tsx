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
    expect(html).toContain('data-selected="true"');
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
  });
});
