import { describe, expect, it, vi } from 'vitest';
import { buildExplorerFilters, buildExplorerResultRows, buildExplorerSurfaceConfig } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

describe('explorer surface config', () => {
  it('builds explorer surface config', () => {
    const config = buildExplorerSurfaceConfig(t);
    expect(config.title).toBe('查询工作台');
    expect(config.tags).toEqual(['统一查询', '上下文保留', '跨信号检索']);
    expect(config.actions).toHaveLength(3);
    expect(config.lanes[0].meta).toBe('查询栏契约');
  });

  it('builds Chinese cold Workbench explorer rows', () => {
    expect(buildExplorerResultRows()).toEqual([
      {
        key: 'trace-checkout',
        signal: '链路',
        service: 'checkout',
        operation: 'POST /checkout',
        status: '错误',
        duration: '1.25s',
        timestamp: '2026-03-30 11:50:57'
      },
      {
        key: 'log-payment',
        signal: '日志',
        service: 'payment',
        operation: '支付失败：余额不足',
        status: '错误',
        duration: '-',
        timestamp: '2026-03-30 11:50:57'
      },
      {
        key: 'metric-frontend',
        signal: '指标',
        service: 'frontend',
        operation: 'http.server.duration',
        status: '正常',
        duration: '0.88ms',
        timestamp: '2026-03-30 11:50:58'
      }
    ]);
  });

  it('builds quick filters for a cross-signal query surface', () => {
    expect(buildExplorerFilters()).toEqual([
      { title: '信号类型', values: ['链路', '日志', '指标', '异常'] },
      { title: '部署环境', values: ['demo', 'prod'] },
      { title: '服务名称', values: ['checkout', 'frontend', 'payment', 'cart'] },
      { title: '状态', values: ['错误', '正常'] }
    ]);
  });
});
