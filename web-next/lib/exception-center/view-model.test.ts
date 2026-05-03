import { describe, expect, it, vi } from 'vitest';
import { buildExceptionCopy, buildExceptionExplorerRows, buildExceptionFilters, buildRecoveryRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('exception view model', () => {
  it('builds 403 exception copy', () => {
    const copy = buildExceptionCopy('403', t);
    expect(copy.title).toBe('403 无权限访问');
    expect(copy.tone).toBe('danger');
    expect(copy.facts[0]).toEqual({ label: '工作区', value: 'exception/403' });
  });

  it('falls back to 404 when type is unknown', () => {
    const copy = buildExceptionCopy('999', t);
    expect(copy.title).toBe('404 路由不存在');
    expect(copy.facts[1]).toEqual({ label: '状态', value: '路由缺失' });
  });

  it('builds 500 exception copy', () => {
    const copy = buildExceptionCopy('500', t);
    expect(copy.title).toBe('500 运行时异常');
    expect(copy.tone).toBe('danger');
    expect(copy.facts[1]).toEqual({ label: '状态', value: '运行时故障' });
  });

  it('builds recovery rows', () => {
    expect(buildRecoveryRows(t)).toEqual([
      { title: '概览', copy: '返回主工作台并重新选择入口。', meta: '/overview' },
      { title: '日志', copy: '确认后端响应和错误日志。', meta: '/log/manage' },
      { title: '链路', copy: '排查链路异常和请求级失败。', meta: '/trace/manage' }
    ]);
  });

  it('builds HertzBeat-native exception rows for the 500 route fixture', () => {
    expect(buildExceptionExplorerRows('500')).toEqual([
      {
        key: 'econnreset-browser-frontend',
        exceptionType: 'ECONNRESET',
        errorMessage: 'read ECONNRESET',
        count: '1',
        lastSeen: '30/03/2026 11:24:59',
        firstSeen: '30/03/2026 11:24:59',
        application: 'browser-frontend'
      },
      {
        key: 'redis-cart',
        exceptionType: 'github.com/redis/go-redis/v9/internal/proto.RedisError',
        errorMessage: 'ERR unknown subcommand "main_notifications". Try CLIENT HELP.',
        count: '1',
        lastSeen: '30/03/2026 11:17:07',
        firstSeen: '30/03/2026 11:17:07',
        application: 'cart'
      },
      {
        key: 'payment-402-checkout',
        exceptionType: '*errors.errorString',
        errorMessage: 'payment service returned 402',
        count: '484',
        lastSeen: '30/03/2026 11:50:57',
        firstSeen: '30/03/2026 11:17:13',
        application: 'checkout'
      },
      {
        key: 'smtp-email',
        exceptionType: 'Error',
        errorMessage: 'SMTP connection failed',
        count: '183',
        lastSeen: '30/03/2026 11:50:37',
        firstSeen: '30/03/2026 11:17:17',
        application: 'email'
      },
      {
        key: 'payment-insufficient-funds',
        exceptionType: 'Error',
        errorMessage: 'Payment failed: insufficient funds',
        count: '484',
        lastSeen: '30/03/2026 11:50:57',
        firstSeen: '30/03/2026 11:17:13',
        application: 'payment'
      }
    ]);
  });

  it('builds Chinese quick filters for the HertzBeat exception sidebar', () => {
    expect(buildExceptionFilters()).toEqual([
      { title: '部署环境', values: ['demo'] },
      { title: '服务', values: ['cart', 'product-catalog', 'quote-python', 'accounting', 'ad', 'browser-frontend', 'checkout', 'currency', 'email', 'fraud-detection'] },
      { title: '主机', values: [] },
      { title: 'K8s 集群', values: [] },
      { title: 'K8s Deployment', values: [] },
      { title: 'K8s 命名空间', values: [] },
      { title: 'K8s Pod', values: [] }
    ]);
  });
});
