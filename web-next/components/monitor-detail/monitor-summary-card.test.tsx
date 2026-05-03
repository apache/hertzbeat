import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorSummaryCard } from './monitor-summary-card';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('monitor summary card', () => {
  it('renders key monitor card parity facts', () => {
    const html = renderToStaticMarkup(
      <MonitorSummaryCard
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'http',
          status: 1,
          instance: '10.0.0.1',
          scheduleType: 'interval',
          intervals: 60,
          description: 'Core checkout monitor',
          labels: { region: 'cn', env: 'prod' },
          annotations: { owner: 'sre' },
          gmtCreate: 1712726400000,
          gmtUpdate: 1712730000000
        }}
        formatTime={time => (time === 1712726400000 ? '2026-04-10 17:00:00' : '2026-04-10 18:00:00')}
        t={t}
      />
    );

    expect(html).toContain('ID');
    expect(html).toContain('checkout-core');
    expect(html).toContain('正常');
    expect(html).not.toContain('>UP<');
    expect(html).toContain('60s');
    expect(html).toContain('Core checkout monitor');
    expect(html).toContain('region');
    expect(html).toContain('env');
    expect(html).toContain('owner');
    expect(html).toContain('2026-04-10 18:00:00');
    expect(html).toMatch(/class=\"[^\"]*monitor-detail-container/);
    expect(html).toContain('data-monitor-basic-density="angular-cardless"');
    expect(html).toContain('data-monitor-basic-content-inset="angular-card-padding"');
    expect(html).toMatch(/class=\"[^\"]*monitor-basic-info/);
    expect(html).toMatch(/class=\"[^\"]*monitor-basic-info[^\"]*px-2/);
    expect(html).toMatch(/class=\"[^\"]*monitor-info-header/);
    expect(html).toMatch(/class=\"[^\"]*monitor-name/);
    expect(html).toMatch(/class=\"[^\"]*monitor-basic-facts/);
    expect(html).toMatch(/class=\"[^\"]*monitor-basic-meta/);
    expect(html).toMatch(/class=\"[^\"]*monitor-basic-meta__row/);
    expect(html).toMatch(/class=\"[^\"]*monitor-basic-meta__row--stacked/);
    expect(html.indexOf('monitor-basic-meta')).toBeLessThan(html.indexOf('region'));
  });

  it('routes label chips through the observability badge owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-summary-card.tsx'), 'utf8');

    expect(source).toContain('ObservabilityBadge');
    expect(source).toContain("t('monitor.status.up')");
    expect(source).not.toContain("t('monitor.detail.status.up')");
    expect(source).not.toContain('inline-flex rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-xs text-[var(--ops-text-secondary)]');
    expect(source).not.toContain("from '../workbench/primitives'");
  });
});
