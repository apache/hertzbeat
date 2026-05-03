type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type PlatformGovernanceGroupKey =
  | 'users-permissions'
  | 'api-access'
  | 'notifications'
  | 'template-marketplace'
  | 'mcp-ai-foundation';

export type PlatformGovernanceFutureDomain =
  | 'security'
  | 'data-observability'
  | 'digital-experience'
  | 'software-delivery'
  | 'cloud-cost'
  | 'ai-observability'
  | 'developer-integrations';

export type PlatformGovernanceGroup = {
  key: PlatformGovernanceGroupKey;
  label: string;
  currentStatus: 'implemented-route' | 'foundation-only';
  routes: string[];
};

export type PlatformGovernanceReview = {
  milestone: 9;
  status: 'in-progress';
  navigationPolicy: 'current-routes-only';
  currentGroups: PlatformGovernanceGroup[];
  futureRoadmapOnly: PlatformGovernanceFutureDomain[];
  futureRoadmapDocs: string[];
  appRouteCandidates: string[];
};

export type PlatformGovernanceClosureReview = {
  milestone: 9;
  status: 'ready-for-new-roadmap-thread';
  navigationPolicy: 'implemented-routes-only';
  completedRoadmapMilestones: number[];
  currentGovernanceGroups: PlatformGovernanceGroupKey[];
  currentAppRoutes: string[];
  futureRoadmapOnly: PlatformGovernanceFutureDomain[];
  futureRoadmapDocs: string[];
  forbiddenFutureAppRoutes: string[];
  nextStep: 'wait-for-new-thread-roadmap-direction';
};

export type PlatformGovernanceRow = {
  key: PlatformGovernanceGroupKey | 'future-roadmap-boundary';
  title: string;
  copy: string;
  meta: string;
};

const FUTURE_GOVERNANCE_DOMAINS: PlatformGovernanceFutureDomain[] = [
  'security',
  'data-observability',
  'digital-experience',
  'software-delivery',
  'cloud-cost',
  'ai-observability',
  'developer-integrations'
];

const GOVERNANCE_GROUP_TITLES: Record<PlatformGovernanceGroupKey, string> = {
  'users-permissions': '用户与权限',
  'api-access': 'API 访问',
  notifications: '通知通道',
  'template-marketplace': '模板与插件',
  'mcp-ai-foundation': 'MCP 与 AI 基础'
};

const FUTURE_GOVERNANCE_TITLES: Record<PlatformGovernanceFutureDomain, string> = {
  security: 'Security',
  'data-observability': 'Data Observability',
  'digital-experience': 'Digital Experience',
  'software-delivery': 'Software Delivery',
  'cloud-cost': 'Cloud Cost',
  'ai-observability': 'AI Observability',
  'developer-integrations': 'Developer Integrations'
};

export function buildPlatformGovernanceReview(): PlatformGovernanceReview {
  const currentGroups: PlatformGovernanceGroup[] = [
    {
      key: 'users-permissions',
      label: 'Users and permissions',
      currentStatus: 'foundation-only',
      routes: ['/passport/login', '/passport/lock']
    },
    {
      key: 'api-access',
      label: 'API access',
      currentStatus: 'implemented-route',
      routes: ['/setting/settings/token']
    },
    {
      key: 'notifications',
      label: 'Notifications',
      currentStatus: 'implemented-route',
      routes: ['/alert/notice']
    },
    {
      key: 'template-marketplace',
      label: 'Template marketplace',
      currentStatus: 'implemented-route',
      routes: ['/setting/define', '/setting/plugins']
    },
    {
      key: 'mcp-ai-foundation',
      label: 'MCP and AI foundations',
      currentStatus: 'foundation-only',
      routes: ['/setting/settings/config', '/setting/settings/mcp-server']
    }
  ];

  return {
    milestone: 9,
    status: 'in-progress',
    navigationPolicy: 'current-routes-only',
    currentGroups,
    futureRoadmapOnly: FUTURE_GOVERNANCE_DOMAINS,
    futureRoadmapDocs: FUTURE_GOVERNANCE_DOMAINS.map(domain => `/docs/roadmap/future-${domain}`),
    appRouteCandidates: currentGroups.flatMap(group => group.routes)
  };
}

export function buildPlatformGovernanceRows(): PlatformGovernanceRow[] {
  const review = buildPlatformGovernanceReview();
  const currentRows = review.currentGroups.map(group => ({
    key: group.key,
    title: GOVERNANCE_GROUP_TITLES[group.key],
    copy:
      group.currentStatus === 'implemented-route'
        ? '已接入当前平台入口，继续沿用现有页面，不新增空菜单。'
        : '保留当前基础能力入口，完整治理能力继续在 roadmap 中推进。',
    meta: group.routes.join(' · ')
  }));

  return [
    ...currentRows,
    {
      key: 'future-roadmap-boundary',
      title: '未来大域边界',
      copy: `${review.futureRoadmapOnly
        .map(domain => FUTURE_GOVERNANCE_TITLES[domain])
        .join('、')} 仅作为 roadmap 能力规划，不展示为已上线应用入口。文档：${review.futureRoadmapDocs.join(' · ')}`,
      meta: 'roadmap only'
    }
  ];
}

export function buildPlatformGovernanceClosureReview(): PlatformGovernanceClosureReview {
  const review = buildPlatformGovernanceReview();

  return {
    milestone: 9,
    status: 'ready-for-new-roadmap-thread',
    navigationPolicy: 'implemented-routes-only',
    completedRoadmapMilestones: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    currentGovernanceGroups: review.currentGroups.map(group => group.key),
    currentAppRoutes: review.appRouteCandidates,
    futureRoadmapOnly: review.futureRoadmapOnly,
    futureRoadmapDocs: review.futureRoadmapDocs,
    forbiddenFutureAppRoutes: review.futureRoadmapOnly.map(domain => `/${domain}`),
    nextStep: 'wait-for-new-thread-roadmap-direction'
  };
}

export function buildSettingsFacts(title: string, nextStep: string, t: Translator) {
  return [
    { label: t('common.workspace'), value: title.toLowerCase() },
    { label: t('common.mode'), value: t('common.settings-mode') },
    { label: t('common.focus'), value: nextStep }
  ];
}

export function buildSettingsRows(t: Translator) {
  return [
    {
      title: t('settings.surface.route-contract.title'),
      copy: t('settings.surface.route-contract.copy'),
      meta: t('common.stable')
    },
    {
      title: t('settings.surface.api-contract.title'),
      copy: t('settings.surface.api-contract.copy'),
      meta: t('common.stable')
    }
  ];
}
