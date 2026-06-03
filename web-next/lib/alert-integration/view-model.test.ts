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
    expect(translateAlertIntegration('alert.integration.kicker', undefined, 'zh-CN')).toBe(String.fromCodePoint(0x96c6, 0x6210, 0x63a5, 0x5165));
    expect(zhT('alert.integration.token.manage')).toBe(String.fromCodePoint(0x7ba1, 0x7406, 0x4ee4, 0x724c));
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
      { title: 'Document source', copy: 'web-next/public/assets/doc/alert-integration/webhook.*.md', meta: 'Next public asset' },
      { title: 'Fallback behavior', copy: 'Integration document loaded', meta: 'Behavior preserved' },
      { title: 'Token management', copy: 'Continue to use the current API token management entry point.', meta: '/setting/settings/token' }
    ]);
  });
});
