import { describe, expect, it } from 'vitest';
import { DATA_SOURCES, buildIntegrationFacts, buildIntegrationPostureRows, buildIntegrationSourceRows } from './view-model';

describe('alert integration view model', () => {
  it('keeps the known provider catalog', () => {
    expect(DATA_SOURCES[0]).toMatchObject({ id: 'webhook', name: '默认Webhook', icon: '/assets/logo.svg' });
    expect(DATA_SOURCES.at(-1)).toMatchObject({
      id: 'volcengine',
      name: '火山引擎云监控',
      icon: '/assets/img/integration/volcengine.svg'
    });
  });

  it('builds integration facts', () => {
    expect(buildIntegrationFacts('webhook', true)).toEqual([
      { label: '集成接入', value: 'alert/integration/webhook' },
      { label: '集成告警源', value: '默认Webhook' },
      { label: '文档状态', value: '已加载' }
    ]);
  });

  it('builds source rows with selected indicator', () => {
    const rows = buildIntegrationSourceRows('webhook');
    expect(rows[0]).toEqual({ title: '默认Webhook', copy: 'webhook', meta: '已选中' });
    expect(rows[1]).toEqual({ title: 'Prometheus', copy: 'prometheus', meta: '/alert/integration/prometheus' });
  });

  it('builds posture rows', () => {
    expect(buildIntegrationPostureRows('webhook', true)).toEqual([
      { title: '文档来源', copy: 'web-app/src/assets/doc/alert-integration/webhook.*.md', meta: '现有 Angular 资产' },
      { title: '回退行为', copy: '集成文档已加载', meta: '行为保留' },
      { title: '令牌管理', copy: '继续使用当前 API 令牌管理入口。', meta: '/setting/settings/token' }
    ]);
  });
});
