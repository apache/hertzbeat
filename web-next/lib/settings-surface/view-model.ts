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
  labelKey: string;
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

const GOVERNANCE_GROUP_TITLE_KEYS: Record<PlatformGovernanceGroupKey, string> = {
  'users-permissions': 'settings.surface.governance.group.users-permissions',
  'api-access': 'settings.surface.governance.group.api-access',
  notifications: 'settings.surface.governance.group.notifications',
  'template-marketplace': 'settings.surface.governance.group.template-marketplace',
  'mcp-ai-foundation': 'settings.surface.governance.group.mcp-ai-foundation'
};

const FUTURE_GOVERNANCE_TITLE_KEYS: Record<PlatformGovernanceFutureDomain, string> = {
  security: 'settings.surface.governance.future.security',
  'data-observability': 'settings.surface.governance.future.data-observability',
  'digital-experience': 'settings.surface.governance.future.digital-experience',
  'software-delivery': 'settings.surface.governance.future.software-delivery',
  'cloud-cost': 'settings.surface.governance.future.cloud-cost',
  'ai-observability': 'settings.surface.governance.future.ai-observability',
  'developer-integrations': 'settings.surface.governance.future.developer-integrations'
};

export function buildPlatformGovernanceReview(): PlatformGovernanceReview {
  const currentGroups: PlatformGovernanceGroup[] = [
    {
      key: 'users-permissions',
      labelKey: GOVERNANCE_GROUP_TITLE_KEYS['users-permissions'],
      currentStatus: 'foundation-only',
      routes: ['/passport/login', '/passport/lock']
    },
    {
      key: 'api-access',
      labelKey: GOVERNANCE_GROUP_TITLE_KEYS['api-access'],
      currentStatus: 'implemented-route',
      routes: ['/setting/settings/token']
    },
    {
      key: 'notifications',
      labelKey: GOVERNANCE_GROUP_TITLE_KEYS.notifications,
      currentStatus: 'implemented-route',
      routes: ['/alert/notice']
    },
    {
      key: 'template-marketplace',
      labelKey: GOVERNANCE_GROUP_TITLE_KEYS['template-marketplace'],
      currentStatus: 'implemented-route',
      routes: ['/setting/define', '/setting/plugins']
    },
    {
      key: 'mcp-ai-foundation',
      labelKey: GOVERNANCE_GROUP_TITLE_KEYS['mcp-ai-foundation'],
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

export function buildPlatformGovernanceRows(t: Translator): PlatformGovernanceRow[] {
  const review = buildPlatformGovernanceReview();
  const currentRows = review.currentGroups.map(group => ({
    key: group.key,
    title: t(GOVERNANCE_GROUP_TITLE_KEYS[group.key]),
    copy:
      group.currentStatus === 'implemented-route'
        ? t('settings.surface.governance.copy.implemented-route')
        : t('settings.surface.governance.copy.foundation-only'),
    meta: group.routes.join(' · ')
  }));
  const futureDomains = review.futureRoadmapOnly
    .map(domain => t(FUTURE_GOVERNANCE_TITLE_KEYS[domain]))
    .join(t('settings.surface.governance.future.separator'));

  return [
    ...currentRows,
    {
      key: 'future-roadmap-boundary',
      title: t('settings.surface.governance.future.title'),
      copy: t('settings.surface.governance.future.copy', {
        domains: futureDomains,
        docs: review.futureRoadmapDocs.join(' · ')
      }),
      meta: t('settings.surface.governance.future.meta')
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
    { label: t('settings.surface.fact.mode-label'), value: t('settings.surface.fact.mode-value') },
    { label: t('settings.surface.fact.focus-label'), value: nextStep }
  ];
}

export function buildSettingsRows(t: Translator) {
  return [
    {
      title: t('settings.surface.route-contract.title'),
      copy: t('settings.surface.route-contract.copy'),
      meta: t('settings.surface.route-contract.meta')
    },
    {
      title: t('settings.surface.api-contract.title'),
      copy: t('settings.surface.api-contract.copy'),
      meta: t('settings.surface.api-contract.meta')
    }
  ];
}
