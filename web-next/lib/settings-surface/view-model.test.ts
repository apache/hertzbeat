import { describe, expect, it, vi } from 'vitest';
import {
  buildPlatformGovernanceClosureReview,
  buildPlatformGovernanceReview,
  buildPlatformGovernanceRows,
  buildSettingsFacts,
  buildSettingsRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('settings surface view model', () => {
  it('builds settings facts', () => {
    expect(buildSettingsFacts('Token management', '生成令牌', t)).toEqual([
      { label: '工作区', value: 'token management' },
      { label: '模式', value: '设置' },
      { label: '焦点', value: '生成令牌' }
    ]);
  });

  it('builds settings surface rows', () => {
    expect(buildSettingsRows(t)).toEqual([
      { title: '设置导航', copy: '从这里进入状态页、采集器、标签、插件、令牌和系统配置。', meta: '路由契约' },
      { title: '运维配置', copy: '统一维护采集器、标签、插件、令牌、状态页和通知通道。', meta: 'API 契约' }
    ]);
  });

  it('organizes milestone 9 platform governance without creating fake future app entries', () => {
    const review = buildPlatformGovernanceReview();

    expect(review.milestone).toBe(9);
    expect(review.status).toBe('in-progress');
    expect(review.navigationPolicy).toBe('current-routes-only');
    expect(review.currentGroups.map(group => group.key)).toEqual([
      'users-permissions',
      'api-access',
      'notifications',
      'template-marketplace',
      'mcp-ai-foundation'
    ]);
    expect(review.currentGroups.find(group => group.key === 'api-access')).toMatchObject({
      labelKey: 'settings.surface.governance.group.api-access',
      routes: ['/setting/settings/token']
    });
    expect(review.currentGroups.find(group => group.key === 'notifications')).toMatchObject({
      labelKey: 'settings.surface.governance.group.notifications',
      routes: ['/alert/notice']
    });
    expect(review.currentGroups.find(group => group.key === 'template-marketplace')?.routes).toEqual([
      '/setting/define',
      '/setting/plugins'
    ]);
    expect(review.currentGroups.find(group => group.key === 'mcp-ai-foundation')?.routes).toEqual([
      '/setting/settings/config',
      '/setting/settings/mcp-server'
    ]);
    expect(review.futureRoadmapOnly).toEqual([
      'security',
      'data-observability',
      'digital-experience',
      'software-delivery',
      'cloud-cost',
      'ai-observability',
      'developer-integrations'
    ]);
    expect(review.futureRoadmapDocs).toEqual([
      '/docs/roadmap/future-security',
      '/docs/roadmap/future-data-observability',
      '/docs/roadmap/future-digital-experience',
      '/docs/roadmap/future-software-delivery',
      '/docs/roadmap/future-cloud-cost',
      '/docs/roadmap/future-ai-observability',
      '/docs/roadmap/future-developer-integrations'
    ]);
    expect(review.appRouteCandidates).not.toEqual(expect.arrayContaining(review.futureRoadmapOnly));
  });

  it('builds operator-facing governance rows from current routes and roadmap docs only', () => {
    const rows = buildPlatformGovernanceRows(t);

    expect(rows.map(row => row.key)).toEqual([
      'users-permissions',
      'api-access',
      'notifications',
      'template-marketplace',
      'mcp-ai-foundation',
      'future-roadmap-boundary'
    ]);
    expect(rows.find(row => row.key === 'api-access')).toMatchObject({
      title: 'API 访问',
      meta: '/setting/settings/token'
    });
    expect(rows.find(row => row.key === 'notifications')).toMatchObject({
      title: '通知通道',
      meta: '/alert/notice'
    });
    expect(rows.find(row => row.key === 'template-marketplace')?.meta).toBe('/setting/define · /setting/plugins');

    const futureBoundary = rows.find(row => row.key === 'future-roadmap-boundary');
    expect(futureBoundary).toMatchObject({
      title: '未来大域边界',
      meta: '仅规划'
    });
    expect(futureBoundary?.copy).toContain('安全治理');
    expect(futureBoundary?.copy).toContain('路线图能力规划');
    expect(futureBoundary?.copy).not.toContain('Data Observability');
    expect(futureBoundary?.copy).toContain('/docs/roadmap/future-security');
    expect(rows.map(row => row.meta).join(' ')).not.toContain('/security');
  });

  it('closes milestone 9 with current app routes separated from future roadmap-only domains', () => {
    const closure = buildPlatformGovernanceClosureReview();

    expect(closure.milestone).toBe(9);
    expect(closure.status).toBe('ready-for-new-roadmap-thread');
    expect(closure.navigationPolicy).toBe('implemented-routes-only');
    expect(closure.completedRoadmapMilestones).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(closure.currentGovernanceGroups).toEqual([
      'users-permissions',
      'api-access',
      'notifications',
      'template-marketplace',
      'mcp-ai-foundation'
    ]);
    expect(closure.currentAppRoutes).toEqual([
      '/passport/login',
      '/passport/lock',
      '/setting/settings/token',
      '/alert/notice',
      '/setting/define',
      '/setting/plugins',
      '/setting/settings/config',
      '/setting/settings/mcp-server'
    ]);
    expect(closure.futureRoadmapOnly).toEqual([
      'security',
      'data-observability',
      'digital-experience',
      'software-delivery',
      'cloud-cost',
      'ai-observability',
      'developer-integrations'
    ]);
    expect(closure.futureRoadmapDocs).toContain('/docs/roadmap/future-security');
    expect(closure.forbiddenFutureAppRoutes).toEqual([
      '/security',
      '/data-observability',
      '/digital-experience',
      '/software-delivery',
      '/cloud-cost',
      '/ai-observability',
      '/developer-integrations'
    ]);
    expect(closure.currentAppRoutes).not.toEqual(expect.arrayContaining(closure.forbiddenFutureAppRoutes));
    expect(closure.nextStep).toBe('wait-for-new-thread-roadmap-direction');
  });
});
