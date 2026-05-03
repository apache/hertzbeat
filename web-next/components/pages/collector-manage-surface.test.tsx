import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('collector manage surface', () => {
  it('renders the cold-matte collector toolbar and dense table shell', async () => {
    const { CollectorManageSurface } = await import('./collector-manage-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.collector': '采集集群',
        'collector.deploy': '部署采集器',
        'collector.online': '上线采集器',
        'collector.offline': '下线采集器',
        'collector.delete': '删除采集器',
        'collector.name': '采集器名称',
        'collector.status': '运行状态',
        'collector.mode': '运行模式',
        'collector.task': '总任务数量',
        'collector.pinned': '固定任务',
        'collector.dispatched': '调度任务',
        'collector.ip': 'IP地址',
        'collector.version': '版本',
        'collector.start-time': '启动时间',
        'collector.mode.public': '公共集群模式',
        'collector.mode.private': '私有云边模式',
        'monitor.collector.status.online': '在线',
        'monitor.collector.status.offline': '离线',
        'common.refresh': '刷新',
        'common.search': '搜索',
        'common.edit': '操作',
        'common.total': 'Total',
        'common.current-page-count': 'Current page'
      }
    });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                collector: {
                  name: 'edge-a',
                  ip: '10.0.0.1',
                  status: 0,
                  mode: 'public',
                  version: '1.0.0',
                  gmtUpdate: '2026-04-10T10:00:00Z'
                },
                pinMonitorNum: 2,
                dispatchMonitorNum: 5
              },
              {
                collector: {
                  name: 'edge-b',
                  ip: '10.0.0.2',
                  status: 1,
                  mode: 'private',
                  version: '1.1.0',
                  gmtUpdate: '2026-04-09T10:00:00Z'
                },
                pinMonitorNum: 1,
                dispatchMonitorNum: 3
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search="edge"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(html).toContain('data-collector-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-collector-header="cold-compact-header"');
    expect(html).toContain('data-collector-command-row="standard-equal-buttons"');
    expect(html).toContain('data-collector-health-evidence="cluster-status"');
    expect(html).toContain('data-collector-health-tone="warning"');
    expect(html).toContain('data-collector-health-freshness="last-seen"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-collector-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-collector-search-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-collector-table-shell="cold-dense-table"');
    expect(html).toContain('data-collector-manage-table="cold-collector-table"');
    expect(html).toContain('data-collector-row-health="collector-status"');
    expect(html).toContain('data-collector-row-actions="cold-icon-actions"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-collector-summary-rail=');
    expect(html).toContain('刷新');
    expect(html).toContain('部署采集器');
    expect(html).toContain('上线采集器');
    expect(html).toContain('下线采集器');
    expect(html).toContain('删除采集器');
    expect(html).toContain('采集器 1 / 2 在线');
    expect(html).toContain('任务 11 · 离线 1');
    expect(html).toContain('最近上报 2026-04-10 18:00:00');
    expect(html).toContain('搜索');
    expect(html).toContain('采集集群');
    expect(html).toContain('采集器名称');
    expect(html).toContain('运行状态');
    expect(html).toContain('运行模式');
    expect(html).toContain('总任务数量');
    expect(html).toContain('固定任务');
    expect(html).toContain('调度任务');
    expect(html).toContain('IP地址');
    expect(html).toContain('版本');
    expect(html).toContain('启动时间');
    expect(html).toContain('edge-a');
    expect(html).toContain('10.0.0.1');
    expect(html).toContain('1.0.0');
    expect(html).toContain('7');
    expect(html).toContain('2');
    expect(html).toContain('5');
    expect(html).toContain('2026-04-10 18:00:00');
  });

  it('uses the shared cold visual owner instead of Workbench table primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/collector-manage-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(source).toContain('data-collector-manage-style-baseline={coldCollectorVisual.canvasName}');
    expect(source).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-collector-health-evidence="cluster-status"');
    expect(source).toContain('data-collector-health-freshness="last-seen"');
    expect(source).toContain('data-collector-row-health="collector-status"');
    expect(source).toContain('data-collector-table-shell="cold-dense-table"');
    expect(source).toContain('data-collector-manage-table="cold-collector-table"');
    expect(source).not.toContain('data-collector-summary-rail');
    expect(source).not.toContain('coldCollectorVisual.search.row');
    expect(source).not.toContain('coldCollectorVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldCollectorVisual.layout.heroGrid');
    expect(source).not.toContain('coldCollectorVisual.layout.railGrid');
    expect(source).not.toContain('coldCollectorVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('WorkbenchTableFrame');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('rounded-[12px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('text-white/78');
    expect(source).not.toContain('text-white/42');
    expect(source).not.toContain('border-white/6');
    expect(source).not.toContain('text-[#f3eee6]');
    expect(source).not.toContain('overflow-x-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');

    expect(source).toContain('border-[#2b3039]');
    expect(source).toContain('bg-[#101217]');
    expect(source).toContain('text-[#eef2f7]');
    expect(source).toContain('text-[#a9b0bb]');
    expect(source).toContain('text-[#858d9a]');
  });
});
