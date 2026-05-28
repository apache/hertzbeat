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
            type: '服务',
            environment: '本地',
            status: '健康',
            statusTone: 'success',
            health: {
              score: 84,
              scoreText: '84 / 100',
              label: '健康评分 84',
              copy: '采集 4 / 4 健康',
              meta: '告警 2 · 异常 0',
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

    expect(html).toContain('data-entity-list-surface="otlp-cold-entity-console"');
    expect(html).toContain('data-entity-list-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-list-header="cold-compact-header"');
    expect(html).toContain('data-entity-list-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-list-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-entity-list-count-strip="cold-inline-counts"');
    expect(html).toContain('data-entity-list-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-entity-list-refresh-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-clear-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-table-shell="cold-dense-table"');
    expect(html).toContain('data-entity-list-table="cold-entity-table"');
    expect(html).toContain('data-entity-list-row-actions="cold-inline-actions"');
    expect(html).toContain('data-entity-list-health-affordance="lightweight-service-health"');
    expect(html).toContain('data-entity-health-score="84"');
    expect(html).toContain('对象目录');
    expect(html).toContain('对象优先调查');
    expect(html).toContain('实体总数');
    expect(html).toContain('活跃异常对象');
    expect(html).toContain('搜索实体名称、命名空间、负责人');
    expect(html).toContain('设置负责人');
    expect(html).toContain('创建实体');
    expect(html).toContain('从遥测发现');
    expect(html).toContain('导入定义');
    expect(html).toContain('显示 1-1 / 1');
    expect(html).toContain('checkout-service');
    expect(html).toContain('健康评分 84');
    expect(html).toContain('采集 4 / 4 健康');
    expect(html).not.toContain('补负责人');
    expect(html).not.toContain('选择环境 · 全部环境');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-list-rail=');
    expect(html).not.toContain('data-entity-list-action-panel=');
    expect(html).not.toContain('signoz-services-table');
    expect(html).not.toContain('angular-sidebar-flush');

    expect(source).toContain('coldOpsCatalogVisual');
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
    expect(source).not.toContain('补负责人');
    expect(source).not.toContain('选择环境 ·');
    expect(source).not.toContain('UserPlus');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('from \'../workbench/primitives\'');
    expect(source).not.toContain('signoz');
    expect(source).not.toContain('angular-');
    expect(source).not.toContain('data-entity-list-rail');
    expect(source).not.toContain('data-entity-list-action-panel');
  });
});
