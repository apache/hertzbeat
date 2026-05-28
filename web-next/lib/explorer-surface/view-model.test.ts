import { describe, expect, it, vi } from 'vitest';
import { buildExplorerFilters, buildExplorerResultRows, buildExplorerSurfaceConfig, explorerSignalTone } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

const t = createTranslatorMock({ locale: 'zh-CN', overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] });

describe('explorer surface config', () => {
  it('builds explorer surface config', () => {
    const config = buildExplorerSurfaceConfig(t);
    expect(config.title).toBe('查询工作台');
    expect(config.tags).toEqual(['统一查询', '上下文保留', '跨信号检索']);
    expect(config.actions).toHaveLength(3);
    expect(config.checklist.map(item => item.meta)).toEqual(['已完成', '下一步', '预留']);
    expect(config.lanes[0].meta).toBe('查询栏契约');
  });

  it('builds Chinese cold Workbench explorer rows', () => {
    expect(buildExplorerResultRows(t)).toEqual([
      {
        key: 'trace-checkout',
        signalKey: 'trace',
        signalTone: 'trace',
        href: '/trace/manage?serviceName=checkout',
        signal: '链路',
        service: 'checkout',
        operation: 'POST /checkout',
        status: '错误',
        duration: '1.25s',
        timestamp: '2026-03-30 11:50:57'
      },
      {
        key: 'log-payment',
        signalKey: 'log',
        signalTone: 'log',
        href: '/log/manage?search=payment',
        signal: '日志',
        service: 'payment',
        operation: '支付失败：余额不足',
        status: '错误',
        duration: '-',
        timestamp: '2026-03-30 11:50:57'
      },
      {
        key: 'metric-frontend',
        signalKey: 'metric',
        signalTone: 'metric',
        href: '/ingestion/otlp/metrics?serviceName=frontend',
        signal: '指标',
        service: 'frontend',
        operation: 'http.server.duration',
        status: '正常',
        duration: '0.88ms',
        timestamp: '2026-03-30 11:50:58'
      }
    ]);
  });

  it('keeps signal tone stable across localized signal labels', () => {
    expect(explorerSignalTone('trace')).toBe('trace');
    expect(explorerSignalTone('log')).toBe('log');
    expect(explorerSignalTone('metric')).toBe('metric');
  });

  it('builds quick filters for a cross-signal query surface', () => {
    expect(buildExplorerFilters(t)).toEqual([
      { title: '信号类型', values: ['链路', '日志', '指标', '异常'] },
      { title: '部署环境', values: ['demo', 'prod'] },
      { title: '服务名称', values: ['checkout', 'frontend', 'payment', 'cart'] },
      { title: '状态', values: ['错误', '正常'] }
    ]);
  });
});
