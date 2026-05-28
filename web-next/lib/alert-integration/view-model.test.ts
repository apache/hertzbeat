import { describe, expect, it } from 'vitest';
import {
  DATA_SOURCES,
  buildAlertIntegrationSourceHref,
  createAlertIntegrationTranslator,
  buildIntegrationFacts,
  buildIntegrationPostureRows,
  buildIntegrationSourceRows,
  translateAlertIntegration
} from './view-model';

describe('alert integration view model', () => {
  it('keeps the known provider catalog', () => {
    expect(DATA_SOURCES[0]).toMatchObject({ id: 'webhook', nameKey: 'alert.integration.source.webhook', icon: '/assets/logo.svg' });
    expect(DATA_SOURCES.at(-1)).toMatchObject({
      id: 'volcengine',
      nameKey: 'alert.integration.source.volcengine',
      icon: '/assets/img/integration/volcengine.svg'
    });
  });

  it('builds integration facts', () => {
    expect(buildIntegrationFacts('webhook', true)).toEqual([
      { label: 'Alert integration', value: 'alert/integration/webhook' },
      { label: 'Integration alert sources', value: 'Default Webhook' },
      { label: 'Document status', value: 'Loaded' }
    ]);
  });

  it('translates integration copy through the requested locale', () => {
    const zhT = createAlertIntegrationTranslator('zh-CN');

    expect(translateAlertIntegration('alert.integration.kicker')).toBe('Alert integration');
    expect(translateAlertIntegration('alert.integration.kicker', undefined, 'zh-CN')).toBe('集成接入');
    expect(zhT('alert.integration.token.manage')).toBe('管理令牌');
  });

  it('builds source rows with selected indicator', () => {
    const rows = buildIntegrationSourceRows('webhook');
    expect(rows[0]).toEqual({ title: 'Default Webhook', copy: 'webhook', meta: 'Selected' });
    expect(rows[1]).toEqual({ title: 'Prometheus', copy: 'prometheus', meta: '/alert/integration/prometheus' });
  });

  it('builds canonical source hrefs from catalog ids', () => {
    expect(buildAlertIntegrationSourceHref(DATA_SOURCES[0])).toBe('/alert/integration/webhook');
  });

  it('builds posture rows', () => {
    expect(buildIntegrationPostureRows('webhook', true)).toEqual([
      { title: 'Document source', copy: 'web-app/src/assets/doc/alert-integration/webhook.*.md', meta: 'Existing Angular asset' },
      { title: 'Fallback behavior', copy: 'Integration document loaded', meta: 'Behavior preserved' },
      { title: 'Token management', copy: 'Continue to use the current API token management entry point.', meta: '/setting/settings/token' }
    ]);
  });
});
