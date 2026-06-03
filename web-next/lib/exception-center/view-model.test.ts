import { describe, expect, it, vi } from 'vitest';
import { buildExceptionCopy, buildExceptionExplorerRows, buildExceptionFilters, buildRecoveryRows, normalizeExceptionRouteType } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('exception view model', () => {
  it('normalizes unsupported exception route params to 404', () => {
    expect(normalizeExceptionRouteType('403')).toBe('403');
    expect(normalizeExceptionRouteType('404')).toBe('404');
    expect(normalizeExceptionRouteType('500')).toBe('500');
    expect(normalizeExceptionRouteType('999')).toBe('404');
    expect(normalizeExceptionRouteType('server-error')).toBe('404');
  });

  it('builds 403 exception copy', () => {
    const copy = buildExceptionCopy('403', t);
    expect(copy.title).toBe(t('exception.403.title'));
    expect(copy.tone).toBe('danger');
    expect(copy.facts[0]).toEqual({ label: t('common.workspace'), value: 'exception/403' });
    expect(copy.rows.map(row => row.meta)).toEqual([t('exception.403.boundary.meta'), t('exception.next-step.meta')]);
  });

  it('falls back to 404 when type is unknown', () => {
    const copy = buildExceptionCopy('999', t);
    expect(copy.title).toBe(t('exception.404.title'));
    expect(copy.facts[1]).toEqual({ label: t('common.status'), value: t('exception.404.fact.status') });
    expect(copy.rows.map(row => row.meta)).toEqual([t('exception.404.boundary.meta'), t('exception.next-step.meta')]);
  });

  it('builds 500 exception copy', () => {
    const copy = buildExceptionCopy('500', t);
    expect(copy.title).toBe(t('exception.500.title'));
    expect(copy.tone).toBe('danger');
    expect(copy.facts[1]).toEqual({ label: t('common.status'), value: t('exception.500.fact.status') });
    expect(copy.rows.map(row => row.meta)).toEqual([t('exception.500.boundary.meta'), t('exception.next-step.meta')]);
  });

  it('falls back to the default subtitle when a type subtitle key is missing', () => {
    const missingSubtitleT: typeof t = (key, params) => (key === 'exception.500.subtitle' ? key : t(key, params));
    const copy = buildExceptionCopy('500', missingSubtitleT);

    expect(copy.subtitle).toBe(t('exception.subtitle.default'));
  });

  it('builds recovery rows', () => {
    expect(buildRecoveryRows(t)).toEqual([
      { title: t('exception.rail.overview.title'), copy: t('exception.rail.overview.copy'), href: '/overview', label: t('menu.dashboard.back') },
      { title: t('exception.rail.logs.title'), copy: t('exception.rail.logs.copy'), href: '/log/manage', label: t('menu.log.manage') },
      { title: t('exception.rail.traces.title'), copy: t('exception.rail.traces.copy'), href: '/trace/manage', label: t('menu.trace.manage') }
    ]);
  });

  it('builds English recovery rail copy without localized fallback text', () => {
    const rows = buildRecoveryRows(enT);

    expect(rows.map(({ title, copy, href }) => ({ title, copy, href }))).toEqual([
      { title: 'Overview', copy: 'Return to the main workspace and choose the entry again.', href: '/overview' },
      { title: 'Logs', copy: 'Confirm backend responses and error logs.', href: '/log/manage' },
      { title: 'Traces', copy: 'Inspect trace anomalies and request-level failures.', href: '/trace/manage' }
    ]);
    expect(rows.map(row => row.copy).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('builds HertzBeat-native exception rows for the 500 route fixture', () => {
    expect(buildExceptionExplorerRows('500')).toEqual([
      {
        key: 'econnreset-browser-frontend',
        href: '/exception/500?error=econnreset-browser-frontend',
        exceptionType: 'ECONNRESET',
        errorMessage: 'read ECONNRESET',
        count: '1',
        lastSeen: '30/03/2026 11:24:59',
        firstSeen: '30/03/2026 11:24:59',
        application: 'browser-frontend'
      },
      {
        key: 'redis-cart',
        href: '/exception/500?error=redis-cart',
        exceptionType: 'github.com/redis/go-redis/v9/internal/proto.RedisError',
        errorMessage: 'ERR unknown subcommand "main_notifications". Try CLIENT HELP.',
        count: '1',
        lastSeen: '30/03/2026 11:17:07',
        firstSeen: '30/03/2026 11:17:07',
        application: 'cart'
      },
      {
        key: 'payment-402-checkout',
        href: '/exception/500?error=payment-402-checkout',
        exceptionType: '*errors.errorString',
        errorMessage: 'payment service returned 402',
        count: '484',
        lastSeen: '30/03/2026 11:50:57',
        firstSeen: '30/03/2026 11:17:13',
        application: 'checkout'
      },
      {
        key: 'smtp-email',
        href: '/exception/500?error=smtp-email',
        exceptionType: 'Error',
        errorMessage: 'SMTP connection failed',
        count: '183',
        lastSeen: '30/03/2026 11:50:37',
        firstSeen: '30/03/2026 11:17:17',
        application: 'email'
      },
      {
        key: 'payment-insufficient-funds',
        href: '/exception/500?error=payment-insufficient-funds',
        exceptionType: 'Error',
        errorMessage: 'Payment failed: insufficient funds',
        count: '484',
        lastSeen: '30/03/2026 11:50:57',
        firstSeen: '30/03/2026 11:17:13',
        application: 'payment'
      }
    ]);
  });

  it('builds localized quick filters for the HertzBeat exception sidebar', () => {
    expect(buildExceptionFilters(t)).toEqual([
      { title: t('exception.filters.deployment-environment'), values: ['demo'] },
      { title: t('exception.filters.service'), values: ['cart', 'product-catalog', 'quote-python', 'accounting', 'ad', 'browser-frontend', 'checkout', 'currency', 'email', 'fraud-detection'] },
      { title: t('exception.filters.host'), values: [] },
      { title: t('exception.filters.k8s-cluster'), values: [] },
      { title: 'K8s Deployment', values: [] },
      { title: t('exception.filters.k8s-namespace'), values: [] },
      { title: 'K8s Pod', values: [] }
    ]);
  });
});
