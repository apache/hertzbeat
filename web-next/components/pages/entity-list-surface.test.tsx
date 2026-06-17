import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { EntityListSurface } from './entity-list-surface';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/search-row', async () => {
  const actual = await vi.importActual<typeof import('../ui/search-row')>('../ui/search-row');
  return actual;
});

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('EntityListSurface', () => {
  it('owns the OTLP cold-matte entity admin/list shell without a copied right rail', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-list-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[
          {
            key: '1',
            name: 'checkout-service',
            type: 'Service',
            environment: 'Local',
            status: 'Healthy',
            statusTone: 'success',
            health: {
              score: 84,
              scoreText: '84 / 100',
              label: 'Health score 84',
              copy: 'Collected 4 / 4 healthy',
              meta: 'Alerts 2 · exceptions 0',
              tone: 'warning'
            },
            monitorCount: '1',
            activeAlertCount: '0',
            relationCount: '2',
            updatedAt: 'now',
            href: '/entities/1'
          }
        ]}
        draft={{ search: 'checkout', type: 'service', status: 'healthy' }}
        total={1}
        rangeFrom={1}
        rangeTo={1}
        abnormalCount={0}
        alertingCount={0}
        linkedCount={1}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-surface="otlp-hertzbeat-ui-entity-console"');
    expect(html).toContain('data-entity-list-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-list-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-list-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-list-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-entity-list-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-entity-list-toolbar="hertzbeat-ui-table-toolbar"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-entity-list-refresh-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-clear-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-entity-list-table="hertzbeat-ui-entity-table"');
    expect(html).toContain('data-entity-list-row-actions="hertzbeat-ui-inline-actions"');
    expect(html).toContain('data-entity-list-health-affordance="lightweight-service-health"');
    expect(html).toContain('data-entity-health-score="84"');
    expect(html).toContain(t('entities.list.title'));
    expect(html).toContain(t('entities.list.kicker'));
    expect(html).toContain(t('entities.list.metric.total'));
    expect(html).toContain(t('entities.list.metric.abnormal'));
    expect(html).toContain(t('entities.list.search.placeholder'));
    expect(html).toContain(t('entities.list.row.action.owner'));
    expect(html).toContain(t('entities.list.action.create'));
    expect(html).toContain(t('entities.list.action.discovery'));
    expect(html).toContain(t('entities.list.action.import'));
    expect(html).toContain(t('entities.list.table.range', { from: 1, to: 1, total: 1 }));
    expect(html).toContain('checkout-service');
    expect(html).toContain('Health score 84');
    expect(html).toContain('Collected 4 / 4 healthy');
    expect(html).not.toContain('\u8865\u8d1f\u8d23\u4eba');
    expect(html).not.toContain('\u9009\u62e9\u73af\u5883 \u00b7 \u5168\u90e8\u73af\u5883');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-list-rail=');
    expect(html).not.toContain('data-entity-list-action-panel=');
    expect(html).not.toContain('signoz-services-table');
    expect(html).not.toContain('angular-sidebar-flush');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[420px]"');
    expect(source).toContain('rounded-[4px]');
    expect(source).toContain('rounded-[3px]');
    expect(source).toContain('min-w-[104px]');
    expect(source).toContain('data-entity-list-row-owner-action="text-only"');
    expect(source).toContain('data-entity-list-health-affordance="lightweight-service-health"');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldEntityVisual.search.row');
    expect(source).not.toContain('coldEntityVisual.search.input');
    expect(source).not.toContain('\u8865\u8d1f\u8d23\u4eba');
    expect(source).not.toContain('\u9009\u62e9\u73af\u5883 \u00b7');
    expect(source).not.toContain('UserPlus');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('from \'../workbench/primitives\'');
    expect(source).not.toContain('signoz');
    expect(source).not.toContain('angular-');
    expect(source).not.toContain('data-entity-list-rail');
    expect(source).not.toContain('data-entity-list-action-panel');
  });
});
